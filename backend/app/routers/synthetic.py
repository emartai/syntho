from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase

router = APIRouter(prefix="/api/v1/synthetic", tags=["synthetic"])


@router.get("", response_model=list)
async def list_synthetic_datasets(
    user_id: str = Depends(get_current_user),
):
    """List all synthetic datasets for the current user."""
    supabase = get_supabase()
    result = (
        supabase.table("synthetic_datasets")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{synthetic_dataset_id}", response_model=dict)
async def get_synthetic_dataset(
    synthetic_dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get a single synthetic dataset by ID."""
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Synthetic dataset not found")
    return result.data[0]
