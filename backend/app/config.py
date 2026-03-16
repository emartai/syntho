import json
from pydantic_settings import (
    BaseSettings,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)
from typing import List, Optional
from pathlib import Path
from pydantic import AliasChoices, Field

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── MVP-required ──────────────────────────────────────────────────────────
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str = Field(validation_alias=AliasChoices("SUPABASE_JWT_SECRET", "JWT_SECRET"))
    modal_api_url: str
    modal_api_secret: str
    frontend_url: str = "http://localhost:3000"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "https://syntho.vercel.app",
    ]

    # ── v2 optional features (warn if missing, never block startup) ────────────
    groq_api_key: Optional[str] = None
    flutterwave_secret_key: Optional[str] = None
    flutterwave_webhook_hash: Optional[str] = None
    redis_url: Optional[str] = None

    # ── File upload limits ────────────────────────────────────────────────────
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_file_types: List[str] = [
        "text/csv",
        "application/json",
        "application/vnd.apache.parquet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    # ── Storage buckets ───────────────────────────────────────────────────────
    datasets_bucket: str = "datasets"
    synthetic_bucket: str = "synthetic"
    reports_bucket: str = "reports"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ):
        """Allow list settings to be provided as JSON or comma-separated strings."""

        class FlexibleEnvSettingsSource(EnvSettingsSource):
            def prepare_field_value(self, field_name, field, value, value_is_complex):
                if field_name in {"allowed_origins", "allowed_file_types"} and isinstance(value, str):
                    trimmed = value.strip()
                    if not trimmed:
                        return []

                    # First try JSON list format, then gracefully fall back to comma-separated input.
                    if trimmed.startswith("["):
                        try:
                            parsed = json.loads(trimmed)
                        except json.JSONDecodeError:
                            parsed = None
                        if isinstance(parsed, list):
                            return [str(item).strip() for item in parsed if str(item).strip()]

                    return [item.strip() for item in trimmed.split(",") if item.strip()]

                return super().prepare_field_value(field_name, field, value, value_is_complex)

        return (
            init_settings,
            FlexibleEnvSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )


def validate_environment(s: "Settings") -> None:
    """Validate MVP-required vars; warn about optional v2 vars."""
    required = {
        "supabase_url": s.supabase_url,
        "supabase_service_key": s.supabase_service_key,
        "supabase_jwt_secret": s.supabase_jwt_secret,
        "modal_api_url": s.modal_api_url,
        "modal_api_secret": s.modal_api_secret,
    }

    missing_required = [
        k.upper()
        for k, v in required.items()
        if not v or v.startswith("your_") or v.startswith("placeholder")
    ]

    if missing_required:
        missing_list = "\n  - ".join(missing_required)
        raise RuntimeError(
            f"\n[ERROR] Missing required environment variables:\n"
            f"  - {missing_list}\n\n"
            f"Copy .env.production.example and fill in real values.\n"
        )

    print("[OK] All MVP-required environment variables are set")

    # Warn about optional v2 features
    optional_warnings = []
    if not s.groq_api_key:
        optional_warnings.append("GROQ_API_KEY not set - Groq AI features disabled (v2)")
    if not s.flutterwave_secret_key:
        optional_warnings.append("FLUTTERWAVE_SECRET_KEY not set - Marketplace payments disabled (v2)")
    if not s.redis_url:
        optional_warnings.append("REDIS_URL not set - Rate limiting uses in-memory fallback")

    for warning in optional_warnings:
        print(f"[WARN] {warning}")


settings = Settings()
validate_environment(settings)
