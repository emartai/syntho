from datetime import datetime, timedelta, timezone

from fastapi import Body, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase


def get_user_plan(user_id: str) -> dict:
    """Return current user plan + usage counters."""
    supabase = get_supabase()
    response = (
        supabase.table("profiles")
        .select("plan,jobs_used_this_month,quota_reset_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return {"plan": "free", "jobs_used_this_month": 0, "quota_reset_at": None}
    return response.data[0]


def _create_notification_once(user_id: str, n_type: str, title: str, message: str, link: str = "/settings/billing"):
    supabase = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    existing = (
        supabase.table("notifications")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", n_type)
        .gte("created_at", since)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    supabase.table("notifications").insert(
        {
            "user_id": user_id,
            "type": n_type,
            "title": title,
            "message": message,
            "link": link,
            "read": False,
        }
    ).execute()


def enforce_generation_quota(user_id: str, dataset_row_count: int, method: str | None = None) -> dict:
    profile = get_user_plan(user_id)
    plan = (profile.get("plan") or "free").lower()
    jobs_used = int(profile.get("jobs_used_this_month") or 0)

    if plan in {"pro", "growth"}:
        return profile

    if jobs_used >= settings.FREE_JOBS_QUOTA:
        _create_notification_once(
            user_id,
            "quota_exhausted",
            "Monthly quota reached — upgrade to continue",
            "Your free monthly generation quota is exhausted.",
        )
        raise HTTPException(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": f"Free plan allows {settings.FREE_JOBS_QUOTA} jobs/month. Upgrade to continue.",
                "upgrade_url": "/settings/billing",
            },
        )

    if jobs_used >= 8:
        _create_notification_once(
            user_id,
            "quota_warning",
            f"You've used {jobs_used} of 10 free jobs this month",
            "Upgrade for unlimited access.",
        )

    if dataset_row_count > settings.FREE_ROW_CAP:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": "Dataset exceeds free tier row cap of 10,000",
                "upgrade_url": "/settings/billing",
            },
        )

    if method == "ctgan":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": "CTGAN requires Pro plan",
                "upgrade_url": "/settings/billing",
            },
        )

    return profile


async def check_generation_quota(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
) -> dict:
    """FastAPI dependency used by /generate to enforce quota by dataset row_count."""
    dataset_id = body.get("dataset_id")
    method = body.get("method")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")

    supabase = get_supabase()
    dataset_resp = (
        supabase.table("datasets")
        .select("id,user_id,row_count")
        .eq("id", dataset_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not dataset_resp.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset = dataset_resp.data[0]
    profile = enforce_generation_quota(
        user_id=user["id"],
        dataset_row_count=int(dataset.get("row_count") or 0),
        method=method,
    )
    return {"profile": profile, "dataset": dataset}
