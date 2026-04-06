from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase

router = APIRouter(prefix="/billing", tags=["billing"])

PLAN_AMOUNT = {"pro": 5000, "growth": 15000}


def _parse_plan_from_tx_ref(tx_ref: str) -> str:
    # SYNTHO-SUB-{userId}-{plan}-{Date.now()}
    parts = tx_ref.split("-")
    if len(parts) < 6 or parts[0] != "SYNTHO" or parts[1] != "SUB":
        raise HTTPException(status_code=400, detail="Invalid tx_ref format")
    plan = parts[-2].lower()
    if plan not in PLAN_AMOUNT:
        raise HTTPException(status_code=400, detail="Unsupported plan in tx_ref")
    return plan


async def _verify_flutterwave_transaction(tx_ref: str) -> dict:
    if not settings.FLUTTERWAVE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured")

    url = "https://api.flutterwave.com/v3/transactions/verify_by_reference"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            url,
            params={"tx_ref": tx_ref},
            headers={"Authorization": f"Bearer {settings.FLUTTERWAVE_SECRET_KEY}"},
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Unable to verify payment")

    payload = response.json()
    if payload.get("status") != "success" or not payload.get("data"):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    return payload["data"]


@router.post("/upgrade")
async def upgrade_plan(body: dict, user: dict = Depends(get_current_user)):
    tx_ref = (body.get("tx_ref") or "").strip()
    if not tx_ref:
        raise HTTPException(status_code=400, detail="tx_ref is required")

    plan = _parse_plan_from_tx_ref(tx_ref)
    expected_amount = PLAN_AMOUNT[plan]

    payment = await _verify_flutterwave_transaction(tx_ref)

    status_value = (payment.get("status") or "").lower()
    amount = int(float(payment.get("amount") or 0))
    currency = (payment.get("currency") or "NGN").upper()

    if status_value != "successful":
        raise HTTPException(status_code=400, detail="Transaction is not successful")
    if currency != "NGN":
        raise HTTPException(status_code=400, detail="Invalid payment currency")
    if amount < expected_amount:
        raise HTTPException(status_code=400, detail="Insufficient payment amount")

    supabase = get_supabase()

    # prevent duplicate tx_ref upgrades
    existing = (
        supabase.table("billing_transactions")
        .select("id")
        .eq("flutterwave_tx_ref", tx_ref)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Transaction has already been processed")

    supabase.table("profiles").update(
        {
            "plan": plan,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", user["id"]).execute()

    supabase.table("billing_transactions").insert(
        {
            "user_id": user["id"],
            "plan": plan,
            "amount": amount,
            "currency": currency,
            "status": "successful",
            "flutterwave_tx_ref": tx_ref,
            "flutterwave_tx_id": str(payment.get("id") or ""),
        }
    ).execute()

    return {"ok": True, "plan": plan, "amount": amount, "tx_ref": tx_ref}


@router.get("/status")
async def billing_status(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    profile = (
        supabase.table("profiles")
        .select("plan,jobs_used_this_month,quota_reset_at")
        .eq("id", user["id"])
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    history = (
        supabase.table("billing_transactions")
        .select("created_at,plan,amount,status,currency,flutterwave_tx_ref")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    row = profile.data[0]
    return {
        "plan": row.get("plan", "free"),
        "jobs_used_this_month": row.get("jobs_used_this_month", 0),
        "quota_reset_at": row.get("quota_reset_at"),
        "history": history.data or [],
    }
