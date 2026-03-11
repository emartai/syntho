import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.services.modal_client import trigger_modal_job
from app.services.supabase import get_supabase


router = APIRouter(prefix="/api/v1/generate", tags=["generate"])


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

    dataset_resp = (
        supabase.table("datasets")
        .select("id,file_path,file_type,user_id")
        .eq("id", dataset_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    dataset = dataset_resp.data
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
        .single()
        .execute()
    )

    if not current.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation job not found")

    if current.data.get("status") in {"completed", "failed"}:
        return current.data

    cancelled = {
        "status": "failed",
        "error_message": "Generation cancelled by user",
        "updated_at": datetime.utcnow().isoformat(),
    }
    supabase.table("synthetic_datasets").update(cancelled).eq("id", synthetic_dataset_id).execute()
    return {"id": synthetic_dataset_id, **cancelled}
