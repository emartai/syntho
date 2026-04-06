from __future__ import annotations

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase

router = APIRouter(prefix="/billing", tags=["billing"])

PLAN_PRICING = {
    "free": 0,
    "pro": 5000,
    "growth": 15000,
}


def _fetch_profile(user_id: str) -> dict:
    supabase = get_supabase()
    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile.data[0]


def _upsert_billing_event(
    user_id: str,
    plan: str,
    tx_ref: str,
    transaction_id: str | int | None,
    amount: float,
    currency: str,
    status_value: str,
    source: str,
) -> None:
    supabase = get_supabase()
    try:
        supabase.table("billing_events").upsert(
            {
                "user_id": user_id,
                "plan": plan,
                "tx_ref": tx_ref,
                "transaction_id": str(transaction_id) if transaction_id is not None else None,
                "amount": amount,
                "currency": currency,
                "status": status_value,
                "source": source,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="tx_ref",
        ).execute()
    except Exception:
        pass


@router.get("/status")
async def get_billing_status(user: dict = Depends(get_current_user)):
    profile = _fetch_profile(user["id"])
    supabase = get_supabase()
    try:
        history = (
            supabase.table("billing_events")
            .select("plan,amount,currency,status,created_at,tx_ref")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        payment_history = history.data or []
    except Exception:
        payment_history = []
    return {
        "plan": profile.get("plan", "free"),
        "jobs_used_this_month": profile.get("jobs_used_this_month", 0),
        "quota_reset_at": profile.get("quota_reset_at"),
        "payment_history": payment_history,
    }


@router.post("/upgrade")
async def upgrade_plan(body: dict, user: dict = Depends(get_current_user)):
    plan = str(body.get("plan") or "").lower()
    tx_ref = str(body.get("tx_ref") or "")
    transaction_id = body.get("transaction_id")

    if plan not in {"pro", "growth"}:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not tx_ref:
        raise HTTPException(status_code=400, detail="tx_ref is required")

    if not settings.FLUTTERWAVE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured")

    verify_url = "https://api.flutterwave.com/v3/transactions/verify_by_reference"
    headers = {
        "Authorization": f"Bearer {settings.FLUTTERWAVE_SECRET_KEY}",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(verify_url, params={"tx_ref": tx_ref}, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Unable to verify payment")

    payload = response.json().get("data") or {}
    amount = float(payload.get("amount") or 0)
    currency = str(payload.get("currency") or "")
    status_value = str(payload.get("status") or "").lower()
    reference_transaction_id = payload.get("id") or transaction_id

    expected_amount = PLAN_PRICING[plan]
    if status_value != "successful" or currency != "NGN" or amount < expected_amount:
        _upsert_billing_event(
            user["id"],
            plan,
            tx_ref,
            reference_transaction_id,
            amount,
            currency or "NGN",
            "failed",
            "checkout",
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")

    supabase = get_supabase()
    supabase.table("profiles").update({"plan": plan}).eq("id", user["id"]).execute()
    _upsert_billing_event(
        user["id"],
        plan,
        tx_ref,
        reference_transaction_id,
        amount,
        currency,
        "successful",
        "checkout",
    )
    supabase.table("notifications").insert(
        {
            "user_id": user["id"],
            "type": "quota_warning",
            "title": "Plan upgraded successfully",
            "message": f"Your account is now on the {plan.title()} plan.",
            "link": "/settings/billing",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()

    return {
        "success": True,
        "plan": plan,
        "transaction_id": reference_transaction_id,
    }
