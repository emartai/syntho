from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.flutterwave import verify_payment, verify_webhook_signature
from app.services.notifications import notify_job_complete, notify_job_failed
import httpx


router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


class ModalWebhookRequest(BaseModel):
    event: str
    synthetic_dataset_id: str
    user_id: str
    data: dict


@router.post("/modal")
async def handle_modal_webhook(
    body: ModalWebhookRequest,
):
    """
    Handle Modal webhook events for job completion/failure.
    """
    supabase = get_supabase()

    if body.event not in ["job.completed", "job.failed"]:
        return {"status": "ignored", "reason": f"Event type {body.event} not processed"}

    # Update synthetic dataset status
    update_data = {
        "status": "completed" if body.event == "job.completed" else "failed",
        "updated_at": datetime.utcnow().isoformat(),
    }
    if body.event == "job.failed":
        update_data["error_message"] = body.data.get("error", "Unknown error")

    supabase.table("synthetic_datasets").update(update_data).eq(
        "id", body.synthetic_dataset_id
    ).execute()

    # Send notification to user
    async with httpx.AsyncClient() as client:
        dataset = supabase.table("datasets").select(
            "name"
        ).eq(
            "id", supabase.table("synthetic_datasets").select("original_dataset_id")
            .eq("id", body.synthetic_dataset_id).single().execute().data.get("original_dataset_id")
        ).single().execute()

        dataset_name = dataset.data.get("name", "your dataset") if dataset.data else "your dataset"

        if body.event == "job.completed":
            await notify_job_complete(
                user_id=body.user_id,
                dataset_name=dataset_name,
                dataset_id=body.synthetic_dataset_id,
                http_client=client
            )
        else:
            await notify_job_failed(
                user_id=body.user_id,
                dataset_name=dataset_name,
                dataset_id=body.synthetic_dataset_id,
                http_client=client
            )

    return {"status": "recorded", "event": body.event}


class FlutterwaveWebhookRequest(BaseModel):
    event: str
    tx_ref: str
    data: dict


@router.post("/flutterwave")
async def handle_flutterwave_webhook(
    body: FlutterwaveWebhookRequest,
):
    """
    Handle Flutterwave webhook events.
    This endpoint is called by the frontend webhook handler for reconciliation.
    """
    supabase = get_supabase()

    if body.event not in ['charge.completed', 'payment.success']:
        return {"status": "ignored", "reason": f"Event type {body.event} not processed"}

    result = await verify_payment(body.tx_ref)

    if not result.is_valid:
        return {"status": "ignored", "reason": "Payment verification failed"}

    existing = supabase.table("purchases").select("id").eq(
        "flutterwave_tx_ref", body.tx_ref
    ).execute()

    if existing.data:
        return {"status": "ignored", "reason": "Purchase already recorded"}

    from backend.app.routers.marketplace import parse_tx_ref
    parsed = parse_tx_ref(body.tx_ref)
    if not parsed:
        return {"status": "ignored", "reason": "Invalid tx_ref format"}

    listing = supabase.table("marketplace_listings").select(
        "id,synthetic_dataset_id,price,seller_id"
    ).eq("id", parsed["listingId"]).single().execute()

    if not listing.data:
        return {"status": "ignored", "reason": "Listing not found"}

    purchase = {
        "buyer_id": parsed["userId"],
        "listing_id": listing.data["id"],
        "amount": result.amount,
        "currency": result.currency,
        "flutterwave_tx_ref": body.tx_ref,
        "flutterwave_tx_id": result.tx_id,
        "status": "completed",
    }

    supabase.table("purchases").insert(purchase).execute()

    current_count = supabase.table("marketplace_listings").select(
        "download_count"
    ).eq("id", listing.data["id"]).single().execute().data.get("download_count", 0)

    supabase.table("marketplace_listings").update({
        "download_count": current_count + 1
    }).eq("id", listing.data["id"]).execute()

    return {"status": "recorded", "purchase_id": purchase}