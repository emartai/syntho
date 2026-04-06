import secrets
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.services.supabase import get_supabase

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

TX_REF_PATTERN = re.compile(
    r"^SYNTHO-SUB-(?P<user_id>[0-9a-fA-F-]{36})-(?P<plan>pro|growth)-(?P<timestamp>[0-9.]+)$"
)


@router.post("/flutterwave")
async def flutterwave_webhook(request: Request):
    if not settings.FLUTTERWAVE_WEBHOOK_HASH:
        raise HTTPException(status_code=503, detail="Webhook hash is not configured")

    signature = request.headers.get("verif-hash", "")
    if not signature or not secrets.compare_digest(signature, settings.FLUTTERWAVE_WEBHOOK_HASH):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event_data = payload.get("data") or {}
    tx_ref = str(event_data.get("tx_ref") or "")
    transaction_id = event_data.get("id")
    status_value = str(event_data.get("status") or "").lower()
    amount = float(event_data.get("amount") or 0)
    currency = str(event_data.get("currency") or "NGN")

    if not tx_ref:
        return {"status": "ignored"}

    match = TX_REF_PATTERN.match(tx_ref)
    plan = match.group("plan").lower() if match else None
    user_id = match.group("user_id") if match else None

    if not user_id or plan not in {"pro", "growth"}:
        return {"status": "ignored"}

    supabase = get_supabase()
    try:
        billing_event = {
            "user_id": user_id,
            "plan": plan,
            "tx_ref": tx_ref,
            "transaction_id": str(transaction_id) if transaction_id is not None else None,
            "amount": amount,
            "currency": currency,
            "status": "successful" if status_value == "successful" else "failed",
            "source": "webhook",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("billing_events").upsert(billing_event, on_conflict="tx_ref").execute()
    except Exception:
        pass

    if status_value == "successful":
        supabase.table("profiles").update({"plan": plan}).eq("id", user_id).execute()
        supabase.table("notifications").insert(
            {
                "user_id": user_id,
                "type": "quota_warning",
                "title": "Plan upgraded successfully",
                "message": f"Your account is now on the {plan.title()} plan.",
                "link": "/settings/billing",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()

    return {"status": "received"}
