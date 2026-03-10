from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    
    # Flutterwave
    flutterwave_secret_key: str
    flutterwave_webhook_hash: str
    
    # Modal ML
    modal_api_url: str
    modal_api_secret: str
    
    # Redis
    redis_url: str
    
    # Frontend
    frontend_url: str = "http://localhost:3000"
    
    # CORS
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "https://your-syntho-app.vercel.app"
    ]
    
    # File upload limits
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_file_types: List[str] = [
        "text/csv",
        "application/json",
        "application/vnd.apache.parquet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    
    # Storage buckets
    datasets_bucket: str = "datasets"
    synthetic_bucket: str = "synthetic"
    reports_bucket: str = "reports"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
