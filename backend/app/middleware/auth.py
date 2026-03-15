import hashlib
from typing import Optional

from fastapi import Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from app.config import settings
from app.services.supabase import get_supabase


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    Dependency that verifies Supabase JWT token and returns user_id.

    Supports both HS256 (legacy) and ES256 (current Supabase default) tokens.
    Falls back to Supabase server-side verification for ES256.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = authorization[7:]

    # 1. Try local HS256 verification (fast, no network round-trip)
    try:
        import base64
        header_part = token.split(".")[0]
        # Pad to multiple of 4
        header_part += "=" * (-len(header_part) % 4)
        import json as _json
        header = _json.loads(base64.b64decode(header_part))
        alg = header.get("alg", "HS256")
    except Exception:
        alg = "HS256"

    if alg == "HS256":
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id: str = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
            return user_id
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # 2. ES256 or other asymmetric algo — verify via Supabase server-side getUser()
    import httpx as _httpx
    try:
        resp = _httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": settings.supabase_service_key},
            timeout=5.0,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = resp.json().get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return user_id
    except _httpx.RequestError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication service unavailable")


async def get_current_user_optional(authorization: str = Header(None)) -> str | None:
    """
    Optional authentication dependency.
    Returns user_id if valid token provided, None otherwise.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


def hash_api_key(key: str) -> str:
    """Hash an API key using SHA256."""
    return hashlib.sha256(key.encode()).hexdigest()


async def get_api_key_user(request: Request) -> Optional[str]:
    """
    Check for API key in Authorization header.
    If valid, returns user_id and updates usage stats.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return None
    
    if not auth_header.startswith("Bearer sk_live_"):
        return None
    
    api_key = auth_header.replace("Bearer ", "")
    key_hash = hash_api_key(api_key)
    
    supabase = get_supabase()
    
    result = supabase.table("api_keys").select(
        "id,user_id,scopes,expires_at,is_active,usage_count"
    ).eq("key_hash", key_hash).eq("is_active", True).execute()
    
    if not result.data:
        return None
    
    key_data = result.data[0]
    
    expires_at = key_data.get("expires_at")
    if expires_at:
        try:
            from datetime import datetime, timezone
            expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expires_dt < datetime.now(timezone.utc):
                return None
        except ValueError:
            pass
    
    new_count = key_data.get("usage_count", 0) + 1
    supabase.table("api_keys").update({
        "usage_count": new_count,
        "last_used_at": "now()",
    }).eq("id", key_data["id"]).execute()
    
    request.state.api_key_id = key_data["id"]
    request.state.api_key_scopes = key_data.get("scopes", [])
    
    return key_data["user_id"]


async def get_current_user_or_api_key(request: Request) -> str:
    """
    Authenticate via either JWT or API key.
    Returns user_id from either method.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    if auth_header.startswith("Bearer sk_live_"):
        user_id = await get_api_key_user(request)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or inactive API key"
            )
        return user_id
    
    return await get_current_user(auth_header)


def require_scope(scope: str):
    """
    Dependency factory to require a specific scope on API key.
    Use after get_current_user_or_api_key.
    """
    async def check_scope(request: Request) -> bool:
        api_key_scopes = getattr(request.state, "api_key_scopes", [])
        if not api_key_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This endpoint requires an API key with appropriate scopes"
            )
        if scope not in api_key_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key requires '{scope}' scope"
            )
        return True
    return check_scope