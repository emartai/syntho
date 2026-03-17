import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import settings
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.storage import storage_service

router = APIRouter(tags=["generate"])


async def check_quota(user_id: str, supabase):
    """Check and enforce freemium quota limits."""
    try:
        profile_resp = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        profile = profile_resp.data[0] if profile_resp.data else None
    except Exception:
        profile = None

    if not profile:
        profile = {
            "plan": "free",
            "jobs_quota": 3,
            "jobs_used_this_month": 0,
        }

    plan = profile.get("plan", "free")
    jobs_used = profile.get("jobs_used_this_month", 0)

    if plan == "free" and jobs_used >= 3:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exceeded",
                "message": "Free plan limit reached. Upgrade to Pro.",
                "upgrade_url": "/settings/billing",
            },
        )

    return profile


async def trigger_modal_generation(
    synthetic_id: str,
    user_id: str,
    dataset_id: str,
    method: str,
    num_rows: int,
    file_url: str,
):
    """Background task: call Modal ML endpoint."""
    import httpx

    payload = {
        "synthetic_dataset_id": synthetic_id,
        "user_id": user_id,
        "dataset_id": dataset_id,
        "method": method,
        "num_rows": num_rows or 1000,
        "file_url": file_url,
        "supabase_url": settings.SUPABASE_URL,
        "supabase_key": settings.SUPABASE_SERVICE_KEY,
    }
    headers = {}
    if settings.MODAL_API_SECRET:
        headers["X-API-Secret"] = settings.MODAL_API_SECRET

    try:
        async with httpx.AsyncClient(timeout=1800.0) as client:
            resp = await client.post(
                settings.MODAL_API_URL,
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
    except Exception as e:
        supabase = get_supabase()
        supabase.table("synthetic_datasets").update(
            {
                "status": "failed",
                "error_message": f"ML service error: {str(e)}",
            }
        ).eq("id", synthetic_id).execute()


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    body: dict,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Create a synthetic generation record and trigger Modal job."""
    user_id = user["id"]
    dataset_id = body.get("dataset_id")
    method = body.get("method")
    num_rows = body.get("num_rows", 1000)

    if not dataset_id or not method:
        raise HTTPException(status_code=400, detail="dataset_id and method are required")

    supabase = get_supabase()

    # Check quota
    await check_quota(user_id, supabase)

    # Verify dataset ownership and status
    dataset_resp = (
        supabase.table("datasets")
        .select("id,file_path,file_type,user_id,status")
        .eq("id", dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    dataset = dataset_resp.data[0] if dataset_resp.data else None
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Dataset is not ready")

    # Check for already-running job
    running_check = (
        supabase.table("synthetic_datasets")
        .select("id,status")
        .eq("original_dataset_id", dataset_id)
        .eq("user_id", user_id)
        .in_("status", ["pending", "running"])
        .execute()
    )
    if running_check.data:
        raise HTTPException(
            status_code=409,
            detail="A generation job is already running for this dataset",
        )

    synthetic_id = str(uuid.uuid4())

    # Create synthetic dataset row
    supabase.table("synthetic_datasets").insert(
        {
            "id": synthetic_id,
            "original_dataset_id": dataset_id,
            "user_id": user_id,
            "generation_method": method,
            "status": "pending",
            "progress": 0,
            "current_step": "Queued",
        }
    ).execute()

    # Generate signed URL for the original file (60 min expiry)
    try:
        file_url = storage_service.get_signed_url(
            "datasets", dataset["file_path"], expires_in=3600
        )
    except Exception:
        file_url = ""

    # Increment quota counter
    try:
        current = (
            supabase.table("profiles")
            .select("jobs_used_this_month")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if current.data:
            new_count = current.data[0].get("jobs_used_this_month", 0) + 1
            supabase.table("profiles").update(
                {"jobs_used_this_month": new_count}
            ).eq("id", user_id).execute()
    except Exception:
        pass

    # Fire background task
    background_tasks.add_task(
        trigger_modal_generation,
        synthetic_id,
        user_id,
        dataset_id,
        method,
        num_rows,
        file_url,
    )

    return {"id": synthetic_id, "status": "pending"}


@router.get("/generate/{synthetic_dataset_id}/status")
async def get_generation_status(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    """Get current status of a generation job."""
    supabase = get_supabase()
    result = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return result.data[0]


@router.patch("/generate/{synthetic_dataset_id}/cancel")
async def cancel_generation_job(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    """Cancel a generation job."""
    supabase = get_supabase()
    current = (
        supabase.table("synthetic_datasets")
        .select("id,status")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Generation job not found")

    if current.data[0].get("status") in {"completed", "failed"}:
        return current.data[0]

    cancelled = {
        "status": "failed",
        "error_message": "Generation cancelled by user",
    }
    supabase.table("synthetic_datasets").update(cancelled).eq(
        "id", synthetic_dataset_id
    ).execute()
    return {"id": synthetic_dataset_id, **cancelled}


@router.get("/synthetic")
async def list_synthetic_datasets(
    user: dict = Depends(get_current_user),
    dataset_id: str = None,
):
    """List synthetic datasets. Optionally filter by original dataset_id."""
    supabase = get_supabase()
    query = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
    )
    if dataset_id:
        query = query.eq("original_dataset_id", dataset_id)
    result = query.execute()
    return result.data or []


@router.get("/synthetic/{synthetic_id}")
async def get_synthetic_dataset(
    synthetic_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single synthetic dataset."""
    supabase = get_supabase()
    result = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("id", synthetic_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Synthetic dataset not found")
    return result.data[0]


@router.get("/synthetic/{synthetic_id}/download")
async def download_synthetic(
    synthetic_id: str,
    user: dict = Depends(get_current_user),
):
    """Get signed download URL for a synthetic dataset."""
    supabase = get_supabase()
    result = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("id", synthetic_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Synthetic dataset not found")

    row = result.data[0]
    if row.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Dataset generation not completed")
    if not row.get("file_path"):
        raise HTTPException(status_code=404, detail="No file available for download")

    signed_url = storage_service.get_signed_url("synthetic", row["file_path"], expires_in=300)
    return {"download_url": signed_url}
