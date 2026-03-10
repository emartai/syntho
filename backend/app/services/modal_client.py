from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.config import settings


def trigger_modal_job(job_payload: dict) -> str:
    """Send generation payload to Modal and return Modal job ID."""
    headers = {
        "X-API-Secret": settings.modal_api_secret,
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(settings.modal_api_url, json=job_payload, headers=headers)

        response.raise_for_status()
        data = response.json()
        job_id = data.get("job_id")
        if not job_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Modal response missing job_id",
            )

        return job_id

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timed out while contacting Modal service",
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to Modal service",
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text or "Modal returned an error"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while triggering Modal job",
        )
