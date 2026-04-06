from fastapi import APIRouter, Request

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/flutterwave")
async def flutterwave_webhook(_: Request):
    # Prompt 5 scaffold endpoint.
    return {"status": "received"}
