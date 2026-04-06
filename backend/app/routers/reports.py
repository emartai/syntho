from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from app.middleware.auth import get_current_user
from app.services.storage import storage_service
from app.services.supabase import get_supabase

router = APIRouter(prefix="/reports", tags=["reports"])


def _verify_ownership(supabase, synthetic_dataset_id: str, user_id: str):
    """Confirm user owns the synthetic dataset."""
    result = (
        supabase.table("synthetic_datasets")
        .select("id,user_id")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Synthetic dataset not found")
    return result.data[0]


@router.get("/privacy/{synthetic_dataset_id}")
async def get_privacy_report(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _verify_ownership(supabase, synthetic_dataset_id, user["id"])

    result = (
        supabase.table("privacy_scores")
        .select("*")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Privacy report not generated yet")
    return result.data[0]


@router.get("/quality/{synthetic_dataset_id}")
async def get_quality_report(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _verify_ownership(supabase, synthetic_dataset_id, user["id"])

    result = (
        supabase.table("quality_reports")
        .select("*")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Quality report not generated yet")
    return result.data[0]


@router.get("/compliance/{synthetic_dataset_id}")
async def get_compliance_report(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    """Return compliance report plus signed PDF URL."""
    supabase = get_supabase()
    _verify_ownership(supabase, synthetic_dataset_id, user["id"])

    result = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Compliance report not generated yet")

    report = result.data[0]
    file_path = report.get("file_path")
    if file_path:
        report["pdf_url"] = storage_service.get_signed_url("reports", file_path, expires_in=300)
    else:
        report["pdf_url"] = None

    return report


@router.get("/compliance/{synthetic_dataset_id}/pdf")
async def download_compliance_pdf(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    """Redirect to signed PDF URL."""
    supabase = get_supabase()
    _verify_ownership(supabase, synthetic_dataset_id, user["id"])

    result = (
        supabase.table("compliance_reports")
        .select("file_path")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data or not result.data[0].get("file_path"):
        raise HTTPException(status_code=404, detail="Compliance PDF not available")

    file_path = result.data[0]["file_path"]
    signed_url = storage_service.get_signed_url("reports", file_path, expires_in=300)
    return RedirectResponse(url=signed_url, status_code=307)
