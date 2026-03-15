import os
from datetime import datetime
from typing import Any

from supabase import Client, create_client


_supabase_client: Client | None = None


def supabase_client() -> Client:
    """Return a singleton Supabase service-role client."""
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.environ["SUPABASE_URL"]
        supabase_service_key = os.environ["SUPABASE_SERVICE_KEY"]
        _supabase_client = create_client(supabase_url, supabase_service_key)

    return _supabase_client


def update_job_progress(
    synthetic_dataset_id: str,
    progress: int,
    status: str,
    message: str,
) -> None:
    """Update synthetic dataset status/progress fields in Supabase."""
    supabase = supabase_client()
    base_payload: dict[str, Any] = {
        "progress": progress,
        "status": status,
        "updated_at": datetime.utcnow().isoformat(),
    }

    if message and status == "failed":
        # Try with error_message column first; fall back without it if column missing
        try:
            full_payload = {**base_payload, "error_message": message}
            supabase.table("synthetic_datasets").update(full_payload).eq("id", synthetic_dataset_id).execute()
            return
        except Exception:
            pass

    supabase.table("synthetic_datasets").update(base_payload).eq("id", synthetic_dataset_id).execute()


def download_from_storage(bucket: str, path: str) -> bytes:
    """Download bytes from Supabase storage."""
    supabase = supabase_client()
    return supabase.storage.from_(bucket).download(path)


def upload_to_storage(
    bucket: str,
    path: str,
    file_bytes: bytes,
    content_type: str,
) -> None:
    """Upload bytes to Supabase storage with upsert enabled."""
    supabase = supabase_client()
    supabase.storage.from_(bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )


def log_job_event(synthetic_dataset_id: str, event: str, message: str) -> None:
    """Persist timeline events for job observability."""
    supabase = supabase_client()
    supabase.table("job_logs").insert(
        {
            "synthetic_dataset_id": synthetic_dataset_id,
            "event": event,
            "message": message,
            "created_at": datetime.utcnow().isoformat(),
        }
    ).execute()
