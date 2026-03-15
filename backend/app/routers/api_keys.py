import secrets
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase


router = APIRouter(prefix="/api/v1/api-keys", tags=["api-keys"])


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: list[str] = ["generate", "read"]
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    key_prefix: str
    scopes: list[str]
    usage_count: int
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool
    created_at: str


class ApiKeyCreateResponse(ApiKeyResponse):
    key: str


class RevokeResponse(BaseModel):
    success: bool
    message: str


def hash_api_key(key: str) -> str:
    """Hash an API key using SHA256."""
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str]:
    """Generate a new API key and return (full_key, prefix)."""
    random_part = secrets.token_urlsafe(36)
    full_key = f"sk_live_{random_part}"
    prefix = full_key[:12]
    return full_key, prefix


@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreateRequest,
    user_id: str = Depends(get_current_user),
):
    """Create a new API key. Returns the full key once - save it immediately!"""
    supabase = get_supabase()

    valid_scopes = {"generate", "read", "marketplace"}
    scopes = [s for s in body.scopes if s in valid_scopes]
    if not scopes:
        scopes = ["generate", "read"]

    full_key, prefix = generate_api_key()
    key_hash = hash_api_key(full_key)

    existing_key = supabase.table("api_keys").select("id").eq("user_id", user_id).execute()
    if len(existing_key.data) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 10 API keys per user",
        )

    api_key = {
        "user_id": user_id,
        "name": body.name,
        "key_hash": key_hash,
        "key_prefix": prefix,
        "scopes": scopes,
        "expires_at": body.expires_at.isoformat() if body.expires_at else None,
        "is_active": True,
    }

    result = supabase.table("api_keys").insert(api_key).execute()

    return {
        "id": result.data[0]["id"],
        "user_id": user_id,
        "name": body.name,
        "key_prefix": prefix,
        "scopes": scopes,
        "usage_count": 0,
        "last_used_at": None,
        "expires_at": body.expires_at.isoformat() if body.expires_at else None,
        "is_active": True,
        "created_at": result.data[0]["created_at"],
        "key": full_key,
    }


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user_id: str = Depends(get_current_user),
):
    """List all API keys for the current user. Never returns full keys."""
    supabase = get_supabase()

    result = supabase.table("api_keys").select(
        "id,user_id,name,key_prefix,scopes,usage_count,last_used_at,expires_at,is_active,created_at"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()

    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "name": row["name"],
            "key_prefix": row["key_prefix"],
            "scopes": row["scopes"],
            "usage_count": row["usage_count"],
            "last_used_at": row["last_used_at"],
            "expires_at": row["expires_at"],
            "is_active": row["is_active"],
            "created_at": row["created_at"],
        }
        for row in result.data
    ]


@router.delete("/{key_id}", response_model=RevokeResponse)
async def revoke_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user),
):
    """Revoke (delete) an API key."""
    supabase = get_supabase()

    existing = supabase.table("api_keys").select("id,user_id").eq("id", key_id).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    if existing.data.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to revoke this key",
        )

    supabase.table("api_keys").delete().eq("id", key_id).execute()

    return {"success": True, "message": "API key revoked successfully"}


@router.post("/{key_id}/rotate", response_model=ApiKeyCreateResponse)
async def rotate_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user),
):
    """Rotate (revoke old and create new) an API key."""
    supabase = get_supabase()

    existing = supabase.table("api_keys").select("id,user_id,name,scopes,expires_at").eq("id", key_id).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    if existing.data.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to rotate this key",
        )

    old_name = existing.data.get("name", "Rotated Key")
    old_scopes = existing.data.get("scopes", ["generate", "read"])
    old_expires_at = existing.data.get("expires_at")

    supabase.table("api_keys").delete().eq("id", key_id).execute()

    full_key, prefix = generate_api_key()
    key_hash = hash_api_key(full_key)

    expires_at_dt = None
    if old_expires_at:
        try:
            expires_at_dt = datetime.fromisoformat(old_expires_at.replace("Z", "+00:00"))
        except ValueError:
            pass

    new_key = {
        "user_id": user_id,
        "name": f"{old_name} (rotated)",
        "key_hash": key_hash,
        "key_prefix": prefix,
        "scopes": old_scopes,
        "expires_at": expires_at_dt.isoformat() if expires_at_dt else None,
        "is_active": True,
    }

    result = supabase.table("api_keys").insert(new_key).execute()

    return {
        "id": result.data[0]["id"],
        "user_id": user_id,
        "name": f"{old_name} (rotated)",
        "key_prefix": prefix,
        "scopes": old_scopes,
        "usage_count": 0,
        "last_used_at": None,
        "expires_at": expires_at_dt.isoformat() if expires_at_dt else None,
        "is_active": True,
        "created_at": result.data[0]["created_at"],
        "key": full_key,
    }