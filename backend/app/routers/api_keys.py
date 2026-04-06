import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


@router.get("")
async def list_api_keys(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = (
        supabase.table("api_keys")
        .select("id,name,key_prefix,scopes,usage_count,last_used_at,expires_at,is_active,created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_api_key(body: dict, user: dict = Depends(get_current_user)):
    name = (body.get("name") or "Default Key").strip()
    scopes = body.get("scopes") or ["read", "generate"]
    expires_at = body.get("expires_at")
    allowed_scopes = {"read", "generate"}
    if any(scope not in allowed_scopes for scope in scopes):
        raise HTTPException(status_code=400, detail="Invalid API key scopes")

    supabase = get_supabase()
    profile = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", user["id"])
        .limit(1)
        .execute()
    )
    plan = profile.data[0].get("plan", "free") if profile.data else "free"
    if plan == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "plan_upgrade_required",
                "message": "API keys are available on Pro and Growth plans.",
                "upgrade_url": "/settings/billing",
            },
        )

    raw = f"sk_live_{secrets.token_urlsafe(32)}"
    key_prefix = raw[:12]
    key_hash = _hash_key(raw)

    payload = {
        "user_id": user["id"],
        "name": name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "scopes": scopes,
        "is_active": True,
    }
    if expires_at:
        payload["expires_at"] = expires_at

    inserted = supabase.table("api_keys").insert(payload).execute()
    if not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to create API key")

    row = inserted.data[0]
    row["key"] = raw
    return row


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(api_key_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("api_keys")
        .select("id")
        .eq("id", api_key_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="API key not found")

    supabase.table("api_keys").update({"is_active": False}).eq("id", api_key_id).execute()
    return None
