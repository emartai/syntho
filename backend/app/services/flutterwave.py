import httpx
import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

FLUTTERWAVE_API_URL = "https://api.flutterwave.com/v3"


@dataclass
class PaymentVerificationResult:
    status: str
    amount: float
    currency: str
    customer: dict
    tx_ref: str
    tx_id: str
    is_valid: bool
    message: str


async def verify_payment(tx_ref: str) -> PaymentVerificationResult:
    """Verify a Flutterwave payment transaction."""
    secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        return PaymentVerificationResult(
            status="error",
            amount=0,
            currency="NGN",
            customer={},
            tx_ref=tx_ref,
            tx_id="",
            is_valid=False,
            message="Flutterwave secret key not configured",
        )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{FLUTTERWAVE_API_URL}/transactions/verify_by_reference",
                params={"tx_ref": tx_ref},
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            data = response.json()

            if response.status_code != 200:
                return PaymentVerificationResult(
                    status="error",
                    amount=0,
                    currency="NGN",
                    customer={},
                    tx_ref=tx_ref,
                    tx_id="",
                    is_valid=False,
                    message=data.get("message", "Payment verification failed"),
                )

            response_data = data.get("data", {})

            if response_data.get("status") != "successful":
                return PaymentVerificationResult(
                    status=response_data.get("status", "unknown"),
                    amount=float(response_data.get("amount", 0)),
                    currency=response_data.get("currency", "NGN"),
                    customer=response_data.get("customer", {}),
                    tx_ref=tx_ref,
                    tx_id=str(response_data.get("id", "")),
                    is_valid=False,
                    message=f"Transaction status: {response_data.get('status')}",
                )

            return PaymentVerificationResult(
                status="successful",
                amount=float(response_data.get("amount", 0)),
                currency=response_data.get("currency", "NGN"),
                customer=response_data.get("customer", {}),
                tx_ref=tx_ref,
                tx_id=str(response_data.get("id", "")),
                is_valid=True,
                message="Payment verified successfully",
            )

        except httpx.TimeoutException:
            return PaymentVerificationResult(
                status="error",
                amount=0,
                currency="NGN",
                customer={},
                tx_ref=tx_ref,
                tx_id="",
                is_valid=False,
                message="Payment verification timed out",
            )
        except Exception as e:
            return PaymentVerificationResult(
                status="error",
                amount=0,
                currency="NGN",
                customer={},
                tx_ref=tx_ref,
                tx_id="",
                is_valid=False,
                message=f"Payment verification error: {str(e)}",
            )


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify Flutterwave webhook signature."""
    import hmac
    import hashlib

    secret_hash = os.environ.get("FLUTTERWAVE_WEBHOOK_HASH")
    if not secret_hash:
        return False

    expected = hmac.new(
        secret_hash.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


async def get_transaction_status(tx_id: str) -> dict:
    """Get transaction status by transaction ID."""
    secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        return {"status": "error", "message": "Flutterwave secret key not configured"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{FLUTTERWAVE_API_URL}/transactions/{tx_id}",
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                return response.json().get("data", {})
            return {"status": "error", "message": response.json().get("message")}

        except Exception as e:
            return {"status": "error", "message": str(e)}


async def create_subaccount(
    bank_code: str,
    account_number: str,
    business_name: str,
    email: str,
    phone_number: Optional[str] = None,
    country: str = "NG",
) -> dict:
    """Create a Flutterwave subaccount for seller payouts."""
    secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        return {"status": "error", "message": "Flutterwave secret key not configured"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{FLUTTERWAVE_API_URL}/subaccounts",
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "account_bank": bank_code,
                    "account_number": account_number,
                    "business_name": business_name,
                    "business_email": email,
                    "business_mobile": phone_number,
                    "country": country,
                    "split_type": "percentage",
                    "split_value": 0.8,
                },
                timeout=30.0,
            )

            data = response.json()

            if response.status_code == 201:
                return {
                    "status": "success",
                    "subaccount_id": data.get("data", {}).get("id"),
                    "subaccount_code": data.get("data", {}).get("subaccount_code"),
                    "message": "Subaccount created successfully",
                }

            return {
                "status": "error",
                "message": data.get("message", "Failed to create subaccount"),
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}


async def list_banks(country: str = "NG") -> dict:
    """List available banks for a country."""
    secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        return {"status": "error", "message": "Flutterwave secret key not configured", "data": []}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{FLUTTERWAVE_API_URL}/banks/{country}",
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            data = response.json()

            if response.status_code == 200:
                return {
                    "status": "success",
                    "data": data.get("data", []),
                }

            return {
                "status": "error",
                "message": data.get("message", "Failed to fetch banks"),
                "data": [],
            }

        except Exception as e:
            return {"status": "error", "message": str(e), "data": []}


async def verify_account_number(
    account_number: str,
    bank_code: str,
    country: str = "NG",
) -> dict:
    """Verify a bank account number and get account name."""
    secret_key = os.environ.get("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        return {"status": "error", "message": "Flutterwave secret key not configured"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{FLUTTERWAVE_API_URL}/accounts/resolve",
                params={
                    "account_number": account_number,
                    "account_bank": bank_code,
                },
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            data = response.json()

            if response.status_code == 200:
                return {
                    "status": "success",
                    "account_name": data.get("data", {}).get("account_name"),
                    "account_number": data.get("data", {}).get("account_number"),
                    "bank_name": data.get("data", {}).get("bank_name"),
                }

            return {
                "status": "error",
                "message": data.get("message", "Failed to verify account"),
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}


def create_split_payment_config(
    seller_subaccount_id: str,
    seller_share_percent: float = 80.0,
) -> dict:
    """Create split payment configuration for marketplace purchases."""
    return {
        "subaccounts": [
            {
                "id": seller_subaccount_id,
                "transaction_charge_type": "percentage",
                "transaction_charge": seller_share_percent,
            }
        ],
        "main_account_transaction_charge_type": "percentage",
        "main_account_transaction_charge": 100.0 - seller_share_percent,
    }