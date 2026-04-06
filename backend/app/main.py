from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import datasets, generate, reports
from app.routers import api_keys, billing, notifications, webhooks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("syntho")


@asynccontextmanager
async def lifespan(app: FastAPI):
    required_settings = {
        "SUPABASE_URL": settings.SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": settings.SUPABASE_SERVICE_KEY,
        "SUPABASE_JWT_SECRET": settings.SUPABASE_JWT_SECRET,
        "MODAL_API_URL": settings.MODAL_API_URL,
        "FRONTEND_URL": settings.FRONTEND_URL,
    }
    missing = [name for name, value in required_settings.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required env vars: {missing}")

    logger.info("Syntho API startup configuration")
    logger.info(f"Version: {app.version}")
    logger.info(f"Allowed origins: {settings.allowed_origins_list}")
    logger.info(f"Modal endpoint: {settings.MODAL_API_URL}")
    logger.info(
        "Quota settings — free_jobs=%s free_rows=%s pro_rows=%s growth_rows=%s",
        settings.FREE_JOBS_QUOTA,
        settings.FREE_ROW_CAP,
        settings.PRO_ROW_CAP,
        settings.GROWTH_ROW_CAP,
    )
    yield


app = FastAPI(
    title="Syntho API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/v1")
app.include_router(generate.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "Syntho API", "docs": "/api/docs"}
