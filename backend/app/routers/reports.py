from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io

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
    """Return privacy score for a synthetic dataset."""
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
    """Return quality report for a synthetic dataset."""
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
    """Return compliance report for a synthetic dataset."""
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
    return result.data[0]


@router.get("/compliance/{synthetic_dataset_id}/pdf")
async def download_compliance_pdf(
    synthetic_dataset_id: str,
    user: dict = Depends(get_current_user),
):
    """Stream compliance report PDF from Supabase storage."""
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

    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(signed_url)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Failed to retrieve PDF")

    return StreamingResponse(
        io.BytesIO(resp.content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=compliance-report.pdf",
        },
    )
