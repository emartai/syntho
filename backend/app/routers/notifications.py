from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    supabase = get_supabase()
    result = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(min(limit, 50))
        .execute()
    )
    return result.data or []


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("notifications")
        .select("id")
        .eq("id", notification_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    supabase.table("notifications").update({"read": True}).eq("id", notification_id).execute()
    return {"id": notification_id, "read": True}


@router.patch("/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("notifications").update({"read": True}).eq("user_id", user["id"]).eq("read", False).execute()
    return {"success": True}
