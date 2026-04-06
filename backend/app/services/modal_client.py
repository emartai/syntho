from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.config import settings


async def trigger_modal_job(job_payload: dict) -> str:
    """Send a generation payload to Modal and return the spawned job id when available."""

    headers = {
        "X-API-Secret": settings.MODAL_API_SECRET,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(settings.MODAL_API_URL, json=job_payload, headers=headers)

        response.raise_for_status()
        data = response.json()
        return data.get("job_id", "")

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timed out while contacting the ML service.",
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to the ML service.",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.response.text or "The ML service returned an error.",
        )
