from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.config import settings


async def trigger_modal_job(payload: dict) -> None:
    """Trigger Modal job with one retry on connection errors."""
    headers = {
        "X-API-Secret": settings.MODAL_API_SECRET,
        "Content-Type": "application/json",
    }

    async def _post() -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await client.post(settings.MODAL_API_URL, json=payload, headers=headers)

    try:
        response = await _post()
    except httpx.ConnectError:
        try:
            response = await _post()
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not connect to Modal service",
            ) from exc

    try:
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timed out while contacting Modal service",
        ) from exc
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text or "Modal returned an error"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
