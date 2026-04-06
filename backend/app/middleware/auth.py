import hashlib
import hmac

import httpx
import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.services.supabase import get_supabase

security = HTTPBearer(auto_error=True)


def _verify_api_key(token: str) -> dict:
    supabase = get_supabase()
    key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    key_prefix = token[:12]

    response = (
        supabase.table("api_keys")
        .select("id,user_id,name,key_hash,key_prefix,is_active,expires_at")
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
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials

    if token.startswith("sk_live_"):
        return _verify_api_key(token)

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
