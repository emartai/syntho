import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.services.modal_client import trigger_modal_job
from app.services.supabase import get_supabase


router = APIRouter(prefix="/api/v1/generate", tags=["generate"])


async def check_quota(user_id: str, supabase):
    """Check and enforce freemium quota limits."""
    try:
        profile_resp = supabase.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        profile = profile_resp.data[0] if profile_resp.data else None
    except Exception:
        # Profile might not exist, create default
        profile = {
            "plan": "free",
            "jobs_quota": 3,
            "jobs_used_this_month": 0,
            "quota_reset_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }

    if not profile:
        # Create default profile for user
        profile = {
            "plan": "free",
            "jobs_quota": 3,
            "jobs_used_this_month": 0,
            "quota_reset_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }

    # Get quota fields with defaults
    plan = profile.get("plan", "free")
    jobs_quota = profile.get("jobs_quota", 3)
    jobs_used = profile.get("jobs_used_this_month", 0)
    
    # Check free tier quota
    if plan == "free" and jobs_used >= jobs_quota:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exceeded",
                "message": f"You have used all {jobs_quota} free jobs this month.",
                "upgrade_url": "/settings/billing"
            }
        )

    return profile


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """Create a synthetic generation record and enqueue Modal job."""
    dataset_id = body.get("dataset_id")
    method = body.get("method")
    config = body.get("config", {})

    if not dataset_id or not method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dataset_id and method are required",
        )

    supabase = get_supabase()

    # Check quota before proceeding
    await check_quota(user_id, supabase)

    # Check for an already-running job on this dataset (409 Conflict)
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
            status_code=status.HTTP_409_CONFLICT,
            detail="A generation job is already running for this dataset",
        )

    dataset_resp = (
        supabase.table("datasets")
        .select("id,file_path,file_type,user_id")
        .eq("id", dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    dataset = dataset_resp.data[0] if dataset_resp.data else None
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    synthetic_dataset_id = str(uuid.uuid4())
    synthetic_payload = {
        "id": synthetic_dataset_id,
        "original_dataset_id": dataset_id,
        "user_id": user_id,
        "generation_method": method,
        "config": config,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    supabase.table("synthetic_datasets").insert(synthetic_payload).execute()

    modal_payload = {
        "synthetic_dataset_id": synthetic_dataset_id,
        "original_file_path": dataset["file_path"],
        "original_file_type": dataset.get("file_type"),
        "method": method,
        "config": config,
        "user_id": user_id,
    }

    try:
        job_id = trigger_modal_job(modal_payload)
    except HTTPException as exc:
        failure_payload = {
            "status": "failed",
            "error_message": exc.detail,
            "updated_at": datetime.utcnow().isoformat(),
        }
        supabase.table("synthetic_datasets").update(failure_payload).eq("id", synthetic_dataset_id).execute()
        raise

    update_payload = {
        "job_id": job_id,
        "updated_at": datetime.utcnow().isoformat(),
    }
    supabase.table("synthetic_datasets").update(update_payload).eq("id", synthetic_dataset_id).execute()

    # Increment quota counter (with error handling)
    try:
        current_jobs = supabase.table("profiles").select("jobs_used_this_month").eq("id", user_id).limit(1).execute()
        if current_jobs.data:
            new_count = current_jobs.data[0].get("jobs_used_this_month", 0) + 1
            supabase.table("profiles").update({"jobs_used_this_month": new_count}).eq("id", user_id).execute()
    except Exception:
        # Profile might not exist, skip quota increment
        pass

    result = {**synthetic_payload, **update_payload}
    return result


@router.patch("/{synthetic_dataset_id}/cancel", response_model=dict)
async def cancel_generation_job(
    synthetic_dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase()

    current = (
        supabase.table("synthetic_datasets")
        .select("id,status")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found")

    if current.data[0].get("status") in {"completed", "failed"}:
        return current.data[0]

    cancelled = {
        "status": "failed",
        "error_message": "Generation cancelled by user",
        "updated_at": datetime.utcnow().isoformat(),
    }
    supabase.table("synthetic_datasets").update(cancelled).eq("id", synthetic_dataset_id).execute()
    return {"id": synthetic_dataset_id, **cancelled}


@router.get("/{synthetic_dataset_id}/status", response_model=dict)
async def get_generation_status(
    synthetic_dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get current status of a generation job (fallback for polling)."""
    supabase = get_supabase()

    result = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found")

    return result.data[0]
