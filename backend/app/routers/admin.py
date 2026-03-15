from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from jose import jwt, JWTError

from app.middleware.auth import get_current_user
from app.config import settings
from app.services.supabase import get_supabase


router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


async def get_current_admin(user_id: str = Depends(get_current_user)) -> str:
    """Verify the current user is an admin."""
    supabase = get_supabase()
    
    result = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    
    if result.data.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    return user_id


class AdminStatsResponse(BaseModel):
    total_users: int
    new_users_this_week: int
    total_datasets: int
    total_generations: int
    total_transactions: int
    total_revenue: float
    platform_revenue: float
    active_api_keys: int
    storage_used_bytes: int


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin_id: str = Depends(get_current_admin),
):
    """Get platform-wide statistics."""
    supabase = get_supabase()
    
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    
    users_result = supabase.table("profiles").select("id", count="exact").execute()
    new_users_result = supabase.table("profiles").select("id", count="exact").gte("created_at", week_ago).execute()
    datasets_result = supabase.table("datasets").select("id", count="exact").execute()
    generations_result = supabase.table("synthetic_datasets").select("id", count="exact").execute()
    api_keys_result = supabase.table("api_keys").select("id", count="exact").eq("is_active", True).execute()
    
    purchases_result = supabase.table("purchases").select("amount,status").eq("status", "completed").execute()
    total_transactions = len(purchases_result.data) if purchases_result.data else 0
    total_revenue = sum(p.get("amount", 0) for p in purchases_result.data) if purchases_result.data else 0
    platform_revenue = total_revenue * 0.2
    
    return {
        "total_users": users_result.count or 0,
        "new_users_this_week": new_users_result.count or 0,
        "total_datasets": datasets_result.count or 0,
        "total_generations": generations_result.count or 0,
        "total_transactions": total_transactions,
        "total_revenue": total_revenue,
        "platform_revenue": platform_revenue,
        "active_api_keys": api_keys_result.count or 0,
        "storage_used_bytes": 0,
    }


class UserListItem(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    dataset_count: int
    api_key_count: int
    created_at: str


@router.get("/users", response_model=list[UserListItem])
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    admin_id: str = Depends(get_current_admin),
):
    """List all users with optional filtering."""
    supabase = get_supabase()
    
    query = supabase.table("profiles").select(
        "id,email,full_name,role,is_active,created_at"
    )
    
    if search:
        query = query.ilike("email", f"%{search}%")
    
    if role:
        query = query.eq("role", role)
    
    result = query.order("created_at", desc=True).execute()
    
    users = []
    for row in result.data:
        datasets_count = supabase.table("datasets").select("id", count="exact").eq("user_id", row["id"]).execute().count or 0
        api_keys_count = supabase.table("api_keys").select("id", count="exact").eq("user_id", row["id"]).execute().count or 0
        
        users.append({
            "id": row["id"],
            "email": row["email"],
            "full_name": row.get("full_name"),
            "role": row.get("role", "user"),
            "is_active": row.get("is_active", True),
            "dataset_count": datasets_count,
            "api_key_count": api_keys_count,
            "created_at": row["created_at"],
        })
    
    return users


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    admin_id: str = Depends(get_current_admin),
):
    """Update user role or status."""
    supabase = get_supabase()
    
    if user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin status",
        )
    
    existing = supabase.table("profiles").select("id").eq("id", user_id).single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    update_data = {}
    if body.role is not None:
        if body.role not in ["user", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role",
            )
        update_data["role"] = body.role
    
    if body.is_active is not None:
        update_data["is_active"] = body.is_active
    
    if not update_data:
        return {"message": "No changes to apply"}
    
    result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    return {"message": "User updated successfully", "user": result.data[0]}


class JobListItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    dataset_id: str
    dataset_name: str
    generation_method: str
    status: str
    progress: int
    error_message: Optional[str]
    started_at: str
    duration_seconds: Optional[int]


@router.get("/jobs", response_model=list[JobListItem])
async def list_jobs(
    status_filter: Optional[str] = None,
    admin_id: str = Depends(get_current_admin),
):
    """List all generation jobs."""
    supabase = get_supabase()
    
    query = supabase.table("synthetic_datasets").select(
        "id,user_id,original_dataset_id,generation_method,status,progress,"
        "error_message,created_at,updated_at"
    )
    
    if status_filter:
        query = query.eq("status", status_filter)
    
    result = query.order("created_at", desc=True).limit(100).execute()
    
    jobs = []
    for row in result.data:
        profile = supabase.table("profiles").select("email").eq("id", row["user_id"]).single().execute()
        dataset = supabase.table("datasets").select("name").eq("id", row["original_dataset_id"]).single().execute()
        
        started = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        updated = datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")) if row.get("updated_at") else datetime.utcnow()
        duration = int((updated - started).total_seconds())
        
        jobs.append({
            "id": row["id"],
            "user_id": row["user_id"],
            "user_email": profile.data.get("email", "Unknown") if profile.data else "Unknown",
            "dataset_id": row["original_dataset_id"],
            "dataset_name": dataset.data.get("name", "Unknown") if dataset.data else "Unknown",
            "generation_method": row.get("generation_method", "unknown"),
            "status": row["status"],
            "progress": row.get("progress", 0),
            "error_message": row.get("error_message"),
            "started_at": row["created_at"],
            "duration_seconds": duration if row["status"] == "completed" else None,
        })
    
    return jobs


@router.post("/jobs/{job_id}/rerun")
async def rerun_job(
    job_id: str,
    admin_id: str = Depends(get_current_admin),
):
    """Re-trigger a failed generation job."""
    supabase = get_supabase()
    
    job = supabase.table("synthetic_datasets").select(
        "id,user_id,original_dataset_id,generation_method,config"
    ).eq("id", job_id).eq("status", "failed").single().execute()
    
    if not job.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed job not found",
        )
    
    dataset = supabase.table("datasets").select(
        "file_path,file_type"
    ).eq("id", job.data["original_dataset_id"]).single().execute()
    
    if not dataset.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original dataset not found",
        )
    
    from app.services.modal_client import trigger_modal_job
    
    modal_payload = {
        "synthetic_dataset_id": job.data["id"],
        "original_file_path": dataset.data["file_path"],
        "original_file_type": dataset.data.get("file_type"),
        "method": job.data["generation_method"],
        "config": job.data.get("config", {}),
        "user_id": job.data["user_id"],
    }
    
    try:
        job_id_new = trigger_modal_job(modal_payload)
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger job: {exc.detail}",
        )
    
    supabase.table("synthetic_datasets").update({
        "job_id": job_id_new,
        "status": "pending",
        "progress": 0,
        "error_message": None,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", job_id).execute()
    
    return {"message": "Job re-triggered successfully", "new_job_id": job_id_new}


class ListingListItem(BaseModel):
    id: str
    title: str
    seller_id: str
    seller_email: str
    price: float
    download_count: int
    is_active: bool
    is_flagged: bool
    flag_reason: Optional[str]
    category: Optional[str]
    created_at: str


@router.get("/marketplace", response_model=list[ListingListItem])
async def list_listings(
    is_active: Optional[bool] = None,
    is_flagged: Optional[bool] = None,
    category: Optional[str] = None,
    admin_id: str = Depends(get_current_admin),
):
    """List all marketplace listings with moderation info."""
    supabase = get_supabase()
    
    query = supabase.table("marketplace_listings").select(
        "id,title,seller_id,price,download_count,is_active,category,created_at"
    )
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    if category:
        query = query.eq("category", category)
    
    result = query.order("created_at", desc=True).execute()
    
    listings = []
    for row in result.data:
        profile = supabase.table("profiles").select("email").eq("id", row["seller_id"]).single().execute()
        
        flag_result = supabase.table("listing_flags").select("reason").eq(
            "listing_id", row["id"]
        ).eq("resolved", False).execute()
        
        is_flagged = len(flag_result.data) > 0
        flag_reason = flag_result.data[0].get("reason") if flag_result.data else None
        
        listings.append({
            "id": row["id"],
            "title": row["title"],
            "seller_id": row["seller_id"],
            "seller_email": profile.data.get("email", "Unknown") if profile.data else "Unknown",
            "price": row["price"],
            "download_count": row.get("download_count", 0),
            "is_active": row.get("is_active", True),
            "is_flagged": is_flagged,
            "flag_reason": flag_reason,
            "category": row.get("category"),
            "created_at": row["created_at"],
        })
    
    if is_flagged is not None:
        listings = [l for l in listings if l["is_flagged"] == is_flagged]
    
    return listings


class DeactivateListingRequest(BaseModel):
    reason: str


@router.patch("/marketplace/{listing_id}/deactivate")
async def deactivate_listing(
    listing_id: str,
    body: DeactivateListingRequest,
    admin_id: str = Depends(get_current_admin),
):
    """Deactivate a marketplace listing."""
    supabase = get_supabase()
    
    existing = supabase.table("marketplace_listings").select("id").eq("id", listing_id).single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    
    supabase.table("marketplace_listings").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", listing_id).execute()
    
    return {"message": "Listing deactivated successfully"}


@router.patch("/marketplace/{listing_id}/activate")
async def activate_listing(
    listing_id: str,
    admin_id: str = Depends(get_current_admin),
):
    """Reactivate a marketplace listing."""
    supabase = get_supabase()
    
    existing = supabase.table("marketplace_listings").select("id").eq("id", listing_id).single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    
    supabase.table("marketplace_listings").update({
        "is_active": True,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", listing_id).execute()
    
    return {"message": "Listing activated successfully"}


@router.get("/marketplace/flags", response_model=list[dict])
async def get_flagged_listings(
    admin_id: str = Depends(get_current_admin),
):
    """Get all flagged listings with flag details."""
    supabase = get_supabase()
    
    flags = supabase.table("listing_flags").select(
        "*, marketplace_listings(title,seller_id,price)"
    ).eq("resolved", False).order("created_at", desc=True).execute()
    
    result = []
    for flag in flags.data:
        result.append({
            "id": flag["id"],
            "listing_id": flag["listing_id"],
            "listing_title": flag.get("marketplace_listings", {}).get("title") if flag.get("marketplace_listings") else "Unknown",
            "reason": flag["reason"],
            "reported_by": flag.get("reported_by"),
            "created_at": flag["created_at"],
        })
    
    return result


@router.post("/marketplace/flags/{flag_id}/resolve")
async def resolve_flag(
    flag_id: str,
    admin_id: str = Depends(get_current_admin),
):
    """Mark a flag as resolved."""
    supabase = get_supabase()
    
    supabase.table("listing_flags").update({
        "resolved": True,
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": admin_id,
    }).eq("id", flag_id).execute()
    
    return {"message": "Flag resolved successfully"}