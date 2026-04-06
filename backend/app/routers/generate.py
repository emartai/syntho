from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.quota import enforce_generation_quota
from app.middleware.auth import get_current_user
from app.services.modal_client import trigger_modal_job
from app.services.supabase import get_supabase
from app.services.storage import storage_service

router = APIRouter(tags=["generate"])


def _get_dataset_for_user(dataset_id: str, user_id: str) -> dict:
    supabase = get_supabase()
    dataset_resp = (
        supabase.table("datasets")
        .select("*")
        .eq("id", dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    dataset = dataset_resp.data[0] if dataset_resp.data else None
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    body: dict,
    user: dict = Depends(get_current_user),
):
    user_id = user["id"]
    dataset_id = body.get("dataset_id")
    method = body.get("method")
    config = body.get("config") or {}
    num_rows = int(config.get("num_rows") or body.get("num_rows") or 0)

    if not dataset_id or not method:
        raise HTTPException(status_code=400, detail="dataset_id and method are required")
    if method not in {"ctgan", "gaussian_copula"}:
        raise HTTPException(status_code=400, detail="Unsupported generation method")

    dataset = _get_dataset_for_user(dataset_id, user_id)
    if dataset.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Dataset is not ready")

    profile = enforce_generation_quota(
        user_id=user_id,
        dataset_row_count=int(dataset.get("row_count") or 0),
        method=method,
    )

    if profile.get("plan") == "free" and method == "gaussian_copula":
        requested_rows = num_rows or int(dataset.get("row_count") or 0)
        if requested_rows > 10_000:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "free_limit_reached",
                    "message": "Free plans can generate at most 10,000 rows.",
                    "upgrade_url": "/settings/billing",
                },
            )

    supabase = get_supabase()
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
        "config": {
            **config,
            "num_rows": num_rows or int(dataset.get("row_count") or 0),
            "plan": profile.get("plan", "free"),
        },
    }
    inserted = supabase.table("synthetic_datasets").insert(insert_payload).execute()
    synthetic_row = inserted.data[0] if inserted.data else insert_payload

    modal_payload = {
        "synthetic_dataset_id": synthetic_id,
        "dataset_file_path": dataset["file_path"],
        "original_file_path": dataset["file_path"],
        "original_file_type": dataset.get("file_type"),
        "original_dataset_id": dataset_id,
        "method": method,
        "config": synthetic_row["config"],
        "user_id": user_id,
    }

    job_id = await trigger_modal_job(modal_payload)
    if job_id:
        supabase.table("synthetic_datasets").update({"job_id": job_id}).eq("id", synthetic_id).execute()
        synthetic_row["job_id"] = job_id

    return synthetic_row


@router.get("/generate/{synthetic_dataset_id}/status")
async def get_generation_status(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
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
        "progress": 0,
    }
    supabase.table("synthetic_datasets").update(cancelled).eq("id", synthetic_dataset_id).execute()
    return {"id": synthetic_dataset_id, **cancelled}


@router.get("/synthetic")
async def list_synthetic_datasets(
    user: dict = Depends(get_current_user),
    dataset_id: str | None = None,
):
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

    synthetic_dataset = result.data[0]

    def latest(table: str) -> dict | None:
        try:
            rows = (
                supabase.table(table)
                .select("*")
                .eq("synthetic_dataset_id", synthetic_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return rows.data[0] if rows.data else None
        except Exception:
            return None

    trust_score = latest("trust_scores")
    privacy_score = latest("privacy_scores")
    quality_report = latest("quality_reports")
    compliance_report = latest("compliance_reports")

    return {
        **synthetic_dataset,
        "trust_score": trust_score,
        "privacy_score": privacy_score,
        "quality_report": quality_report,
        "compliance_report": compliance_report,
    }


@router.get("/synthetic/{synthetic_id}/download")
async def download_synthetic(
    synthetic_id: str,
    user: dict = Depends(get_current_user),
):
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
