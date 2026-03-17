from supabase import create_client, Client
from app.config import settings


class SupabaseClient:
    """Singleton Supabase client using service role key."""

    _instance: Client | None = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance."""
        if cls._instance is None:
            cls._instance = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
            )
        return cls._instance


def get_supabase() -> Client:
    """Dependency to get Supabase client."""
    return SupabaseClient.get_client()
