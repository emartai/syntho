import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.quota import check_generation_quota
from app.middleware.auth import get_current_user
from app.services.modal_client import trigger_modal_job
from app.services.supabase import get_supabase
from app.services.storage import storage_service

router = APIRouter(tags=["generate"])


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    body: dict,
    quota_ctx: dict = Depends(check_generation_quota),
    user: dict = Depends(get_current_user),
):
    """Create a synthetic generation record and trigger Modal job."""
    user_id = user["id"]
    dataset_id = body.get("dataset_id")
    method = body.get("method")
    num_rows = int(body.get("num_rows", 1000))
    config = body.get("config", {}) or {}

    if not dataset_id or not method:
        raise HTTPException(status_code=400, detail="dataset_id and method are required")

    if method not in {"gaussian_copula", "ctgan"}:
        raise HTTPException(status_code=400, detail="Unsupported method")

    supabase = get_supabase()

    dataset_resp = (
        supabase.table("datasets")
        .select("id,file_path,file_type,user_id,status,row_count")
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

    insert_payload = {
        "id": synthetic_id,
        "original_dataset_id": dataset_id,
        "user_id": user_id,
        "generation_method": method,
        "status": "pending",
        "progress": 0,
        "config": config,
    }
    inserted = supabase.table("synthetic_datasets").insert(insert_payload).execute()

    modal_payload = {
        "synthetic_dataset_id": synthetic_id,
        "dataset_file_path": dataset["file_path"],
        "dataset_file_type": dataset.get("file_type"),
        "original_dataset_id": dataset_id,
        "method": method,
        "num_rows": num_rows,
        "config": config,
        "user_id": user_id,
    }

    try:
        await trigger_modal_job(modal_payload)
    except Exception as exc:
        supabase.table("synthetic_datasets").update(
            {
                "status": "failed",
                "error_message": str(exc),
            }
        ).eq("id", synthetic_id).execute()
        raise

    if inserted.data:
        return inserted.data[0]
    return insert_payload


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
        "error_message": "Cancelled by user",
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
    """Get a single synthetic dataset with related scores."""
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

    def _many(table: str):
        resp = (
            supabase.table(table)
            .select("*")
            .eq("synthetic_dataset_id", synthetic_id)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []

    privacy_scores = _many("privacy_scores")
    quality_reports = _many("quality_reports")
    compliance_reports = _many("compliance_reports")
    trust_scores = _many("trust_scores")

    return {
        **row,
        "trust_score": trust_scores[0] if trust_scores else None,
        "privacy_scores": privacy_scores,
        "quality_reports": quality_reports,
        "compliance_reports": compliance_reports,
        # Backward compatibility for existing frontend consumers.
        "privacy_score": privacy_scores[0] if privacy_scores else None,
        "quality_report": quality_reports[0] if quality_reports else None,
        "compliance_report": compliance_reports[0] if compliance_reports else None,
    }


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
