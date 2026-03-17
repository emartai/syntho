from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    JWT_SECRET: str
    MODAL_API_URL: str = "https://emart29--syntho-ml-run-job.modal.run"
    MODAL_API_SECRET: str = ""
    FRONTEND_URL: str
    ALLOWED_ORIGINS: str = ""

    # v2 — optional, no validation
    GROQ_API_KEY: str = ""
    FLUTTERWAVE_SECRET_KEY: str = ""
    REDIS_URL: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        origins = set()
        origins.add("https://syntho-henna.vercel.app")
        origins.add("https://syntho.vercel.app")
        if self.FRONTEND_URL:
            origins.add(self.FRONTEND_URL.strip())
        if self.ALLOWED_ORIGINS:
            for o in self.ALLOWED_ORIGINS.split(","):
                if o.strip():
                    origins.add(o.strip())
        return list(origins)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
