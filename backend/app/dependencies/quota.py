from fastapi import HTTPException

from app.config import settings
from app.services.supabase import get_supabase


def _fetch_profile(user_id: str) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table("profiles")
        .select("plan,jobs_used_this_month")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return {"plan": "free", "jobs_used_this_month": 0}
    return response.data[0]


def get_user_plan(user_id: str) -> dict:
    return _fetch_profile(user_id)


def enforce_generation_quota(
    user_id: str,
    dataset_row_count: int,
    method: str | None = None,
) -> dict:
    profile = _fetch_profile(user_id)
    plan = profile.get("plan", "free")
    jobs_used = profile.get("jobs_used_this_month", 0)

    if plan == "free" and jobs_used >= settings.FREE_JOBS_QUOTA:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": f"Free plan allows {settings.FREE_JOBS_QUOTA} jobs/month. Upgrade to continue.",
                "upgrade_url": "/settings/billing",
            },
        )

    if plan == "free" and dataset_row_count > settings.FREE_ROW_CAP:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": f"Free plan supports up to {settings.FREE_ROW_CAP:,} rows per dataset.",
                "upgrade_url": "/settings/billing",
            },
        )

    if plan == "free" and method == "ctgan":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "plan_upgrade_required",
                "message": "CTGAN requires the Pro plan.",
                "upgrade_url": "/settings/billing",
            },
        )

    return profile
