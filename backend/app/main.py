import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import datasets, generate, reports, marketplace, webhooks, api_keys, public_api, admin, ai, synthetic
from app.middleware.rate_limit import rate_limit_middleware


class _StripServerHeader:
    """ASGI wrapper that removes the Server header set by uvicorn."""

    def __init__(self, app):
        self._app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        async def _send(message):
            if message["type"] == "http.response.start":
                headers = [
                    (k, v) for k, v in message.get("headers", [])
                    if k.lower() != b"server"
                ]
                message = {**message, "headers": headers}
            await send(message)

        await self._app(scope, receive, _send)

logger = logging.getLogger("syntho")

# Create FastAPI app
app = FastAPI(
    title="Syntho API",
    description="Synthetic Data Marketplace API",
    version="1.0.0",
    docs_url="/api/docs" if settings.frontend_url.startswith("http://localhost") else None,
    redoc_url="/api/redoc" if settings.frontend_url.startswith("http://localhost") else None,
    openapi_url="/api/openapi.json" if settings.frontend_url.startswith("http://localhost") else None,
)


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


# ── Request logging middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    logger.info(
        "%s %s %s %dms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ── Rate limiting middleware ───────────────────────────────────────────────────
@app.middleware("http")
async def rate_limit_api_keys(request: Request, call_next):
    if request.url.path.startswith("/api/v1/") and "api-keys" not in request.url.path:
        return await rate_limit_middleware(request, call_next)
    return await call_next(request)


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions — never leak stack traces to clients."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": "Something went wrong"},
    )


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    env = "production" if not settings.frontend_url.startswith("http://localhost") else "development"
    return {"status": "ok", "version": "1.0.0", "env": env}


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["root"])
async def root():
    return {
        "name": "Syntho API",
        "version": "1.0.0",
        "health": "/health",
    }


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(datasets.router)
app.include_router(generate.router)
app.include_router(reports.router)
app.include_router(marketplace.router)
app.include_router(webhooks.router)
app.include_router(api_keys.router)
app.include_router(public_api.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(synthetic.router)


# ── Startup/shutdown ───────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logger.info("Syntho API v1.0.0 starting — env: %s", settings.frontend_url)
    logger.info("CORS origins: %s", settings.allowed_origins)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Syntho API shutting down")


# Wrap with ASGI middleware to strip the uvicorn Server header at protocol level
app = _StripServerHeader(app)  # type: ignore[assignment]
