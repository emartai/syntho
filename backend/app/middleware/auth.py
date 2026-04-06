import hashlib
import hmac
from datetime import datetime, timezone

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.services.supabase import get_supabase

security = HTTPBearer(auto_error=True)


def _required_scope(request: Request) -> str:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return "read"
    return "generate"


def _verify_api_key(token: str, request: Request) -> dict:
    supabase = get_supabase()
    key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    key_prefix = token[:12]

    response = (
        supabase.table("api_keys")
        .select("id,user_id,name,key_hash,key_prefix,is_active,expires_at,scopes,usage_count")
        .eq("key_prefix", key_prefix)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    row = response.data[0]
    stored_hash = row.get("key_hash") or ""
    if not hmac.compare_digest(stored_hash, key_hash):
        raise HTTPException(status_code=401, detail="Invalid API key")

    expires_at = row.get("expires_at")
    if expires_at:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expiry <= datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key expired")

    required_scope = _required_scope(request)
    scopes = row.get("scopes") or []
    if required_scope not in scopes:
        raise HTTPException(status_code=403, detail=f"API key missing '{required_scope}' scope")

    supabase.table("api_keys").update(
        {
            "usage_count": int(row.get("usage_count") or 0) + 1,
            "last_used_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", row["id"]).execute()

    return {
        "id": row["user_id"],
        "auth_type": "api_key",
        "api_key_id": row["id"],
        "role": "authenticated",
    }


def _verify_hs256(token: str) -> dict:
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {
        "id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("role", "authenticated"),
        "auth_type": "jwt",
    }


async def _verify_es256_with_supabase(token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }
    url = f"{settings.SUPABASE_URL}/auth/v1/user"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "id": user_id,
        "email": data.get("email", ""),
        "role": "authenticated",
        "auth_type": "jwt",
    }


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials

    if token.startswith("sk_live_"):
        return _verify_api_key(token, request)

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "")

        if alg == "HS256":
            return _verify_hs256(token)

        if alg == "ES256":
            return await _verify_es256_with_supabase(token)

        raise HTTPException(status_code=401, detail="Unsupported token algorithm")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
