from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.config import settings
from app.routers import datasets, generate, reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("syntho")


@asynccontextmanager
async def lifespan(app: FastAPI):
    required = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "JWT_SECRET",
        "MODAL_API_URL",
        "FRONTEND_URL",
    ]
    missing = [v for v in required if not os.getenv(v)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {missing}")

    logger.info(
        f"Syntho API v1.0.0 — CORS origins: {settings.allowed_origins_list}"
    )
    logger.info(f"Modal endpoint: {settings.MODAL_API_URL}")

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — Groq AI disabled (v2)")
    if not settings.FLUTTERWAVE_SECRET_KEY:
        logger.warning("FLUTTERWAVE_SECRET_KEY not set — payments disabled (v2)")
    if not settings.REDIS_URL:
        logger.warning("REDIS_URL not set — rate limiting uses in-memory fallback")
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


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "Syntho API", "docs": "/api/docs"}
