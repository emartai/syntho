from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from app.config import settings
from app.models.schemas import HealthResponse
from app.routers import datasets, generate


# Create FastAPI app
app = FastAPI(
    title="Syntho API",
    description="Synthetic Data Marketplace API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Secret"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)


# Exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to prevent leaking internal errors."""
    print(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Health check endpoint (no auth required)
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """
    Health check endpoint for monitoring.
    Returns service status and timestamp.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow()
    }


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Syntho API",
        "version": "1.0.0",
        "description": "Synthetic Data Marketplace API",
        "docs": "/api/docs",
        "health": "/health"
    }


# Include routers
app.include_router(datasets.router)
app.include_router(generate.router)


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("🚀 Syntho API starting up...")
    print(f"📍 Environment: {settings.frontend_url}")
    print(f"🔒 CORS origins: {settings.allowed_origins}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    print("👋 Syntho API shutting down...")
