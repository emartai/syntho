from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.services.storage import storage_service
from app.services.supabase import get_supabase

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/compliance/{synthetic_dataset_id}", response_model=dict)
async def get_compliance_report(
    synthetic_dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    """Return latest compliance report metadata and a signed PDF URL."""
    supabase = get_supabase()

    synthetic_dataset = (
        supabase.table("synthetic_datasets")
        .select("id,user_id")
        .eq("id", synthetic_dataset_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not synthetic_dataset.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Synthetic dataset not found")

    compliance_report = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    report = compliance_report.data
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compliance report not found")

    signed_url = None
    file_path = report.get("file_path")
    if file_path:
        signed_url = storage_service.get_signed_url("reports", file_path, expires_in=3600)

    return {
        "report": report,
        "signed_url": signed_url,
    }
