# Notification service for backend
import httpx
from app.config import settings

SUPABASE_URL = settings.supabase_url
SUPABASE_SERVICE_KEY = settings.supabase_service_key

async def notify_user(
    user_id: str,
    type: str,
    data: dict,
    http_client: httpx.AsyncClient
) -> bool:
    """Call Supabase Edge Function to send notification and email."""
    try:
        response = await http_client.post(
            f"{SUPABASE_URL}/functions/v1/notify",
            json={
                "user_id": user_id,
                "type": type,
                "data": data
            },
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to send notification: {e}")
        return False


async def notify_job_complete(
    user_id: str,
    dataset_name: str,
    dataset_id: str,
    http_client: httpx.AsyncClient
) -> bool:
    """Notify user that their synthetic dataset is ready."""
    return await notify_user(
        user_id=user_id,
        type="job_complete",
        data={"name": dataset_name, "dataset_id": dataset_id},
        http_client=http_client
    )


async def notify_purchase_made(
    user_id: str,
    listing_title: str,
    amount: str,
    dataset_id: str,
    http_client: httpx.AsyncClient
) -> bool:
    """Notify user of a successful purchase."""
    return await notify_user(
        user_id=user_id,
        type="purchase_made",
        data={"listing_title": listing_title, "amount": amount, "dataset_id": dataset_id},
        http_client=http_client
    )


async def notify_sale_made(
    user_id: str,
    title: str,
    net_amount: str,
    http_client: httpx.AsyncClient
) -> bool:
    """Notify seller of a new sale."""
    return await notify_user(
        user_id=user_id,
        type="sale_made",
        data={"title": title, "net_amount": net_amount},
        http_client=http_client
    )


async def notify_job_failed(
    user_id: str,
    dataset_name: str,
    dataset_id: str,
    http_client: httpx.AsyncClient
) -> bool:
    """Notify user that their job failed."""
    return await notify_user(
        user_id=user_id,
        type="job_failed",
        data={"name": dataset_name, "dataset_id": dataset_id},
        http_client=http_client
    )