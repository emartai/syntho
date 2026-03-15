from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase


router = APIRouter(prefix="/api/v1/marketplace", tags=["marketplace"])


class MarketplaceListingResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: Optional[str]
    seller_avatar: Optional[str]
    synthetic_dataset_id: str
    title: str
    description: Optional[str]
    tags: Optional[list[str]]
    category: Optional[str]
    price: float
    currency: str
    is_active: bool
    download_count: int
    preview_schema: Optional[dict]
    generation_method: Optional[str]
    privacy_score: Optional[float]
    privacy_risk_level: Optional[str]
    quality_score: Optional[float]
    row_count: Optional[int]
    column_count: Optional[int]
    created_at: str


class PaginatedListingsResponse(BaseModel):
    listings: list[MarketplaceListingResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


@router.get("", response_model=PaginatedListingsResponse)
async def list_marketplace_listings(
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    generation_method: Optional[str] = None,
    low_risk_only: bool = False,
    sort_by: str = "newest",
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=48),
    user_id: str = Depends(get_current_user),
):
    """List active marketplace listings with filters, search, sort, and pagination."""
    supabase = get_supabase()

    query = supabase.table("marketplace_listings").select(
        "id,seller_id,synthetic_dataset_id,title,description,tags,category,price,currency,"
        "is_active,download_count,preview_schema,created_at"
    ).eq("is_active", True)

    if search:
        query = query.ilike("title", f"%{search}%")

    if category:
        query = query.eq("category", category)

    if min_price is not None:
        query = query.gte("price", min_price)

    if max_price is not None:
        query = query.lte("price", max_price)

    if generation_method:
        query = query.eq("generation_method", generation_method)

    if low_risk_only:
        query = query.eq("privacy_risk_level", "low")

    sort_column = "created_at"
    sort_order = "desc"

    if sort_by == "most_downloaded":
        sort_column = "download_count"
        sort_order = "desc"
    elif sort_by == "lowest_price":
        sort_column = "price"
        sort_order = "asc"
    elif sort_by == "highest_privacy":
        sort_column = "privacy_score"
        sort_order = "desc"

    query = query.order(sort_column, desc=(sort_order == "desc"))

    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()

    listings = []
    for row in result.data:
        synthetic = supabase.table("synthetic_datasets").select(
            "generation_method,row_count,column_count"
        ).eq("id", row["synthetic_dataset_id"]).single().execute()

        privacy = supabase.table("privacy_scores").select(
            "overall_score,risk_level"
        ).eq("synthetic_dataset_id", row["synthetic_dataset_id"]).single().execute()

        quality = supabase.table("quality_reports").select(
            "overall_score"
        ).eq("synthetic_dataset_id", row["synthetic_dataset_id"]).single().execute()

        profile = supabase.table("profiles").select(
            "full_name,avatar_url"
        ).eq("id", row["seller_id"]).single().execute()

        listings.append({
            **row,
            "seller_name": profile.data.get("full_name") if profile.data else None,
            "seller_avatar": profile.data.get("avatar_url") if profile.data else None,
            "generation_method": synthetic.data.get("generation_method") if synthetic.data else None,
            "row_count": synthetic.data.get("row_count") if synthetic.data else None,
            "column_count": synthetic.data.get("column_count") if synthetic.data else None,
            "privacy_score": privacy.data.get("overall_score") if privacy.data else None,
            "privacy_risk_level": privacy.data.get("risk_level") if privacy.data else None,
            "quality_score": quality.data.get("overall_score") if quality.data else None,
        })

    total_query = supabase.table("marketplace_listings").select("id", count="exact").eq("is_active", True)

    if search:
        total_query = total_query.ilike("title", f"%{search}%")
    if category:
        total_query = total_query.eq("category", category)
    if min_price is not None:
        total_query = total_query.gte("price", min_price)
    if max_price is not None:
        total_query = total_query.lte("price", max_price)
    if generation_method:
        total_query = total_query.eq("generation_method", generation_method)
    if low_risk_only:
        total_query = total_query.eq("privacy_risk_level", "low")

    total_result = total_query.execute()
    total = total_result.count or 0

    return {
        "listings": listings,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/{listing_id}", response_model=MarketplaceListingResponse)
async def get_marketplace_listing(
    listing_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get a single marketplace listing with full details."""
    supabase = get_supabase()

    result = supabase.table("marketplace_listings").select(
        "id,seller_id,synthetic_dataset_id,title,description,tags,category,price,currency,"
        "is_active,download_count,preview_schema,created_at"
    ).eq("id", listing_id).eq("is_active", True).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    row = result.data

    synthetic = supabase.table("synthetic_datasets").select(
        "generation_method,row_count,column_count,file_path"
    ).eq("id", row["synthetic_dataset_id"]).single().execute()

    privacy = supabase.table("privacy_scores").select(
        "overall_score,risk_level,details"
    ).eq("synthetic_dataset_id", row["synthetic_dataset_id"]).single().execute()

    quality = supabase.table("quality_reports").select(
        "correlation_score,distribution_score,overall_score,column_stats"
    ).eq("synthetic_dataset_id", row["synthetic_dataset_id"]).single().execute()

    compliance = supabase.table("compliance_reports").select(
        "report_type,passed,findings"
    ).eq("synthetic_dataset_id", row["synthetic_dataset_id"]).execute()

    profile = supabase.table("profiles").select(
        "full_name,avatar_url"
    ).eq("id", row["seller_id"]).single().execute()

    purchase_check = supabase.table("purchases").select("id").eq(
        "listing_id", listing_id
    ).eq("buyer_id", user_id).eq("status", "completed").execute()

    has_purchased = len(purchase_check.data) > 0

    return {
        **row,
        "seller_name": profile.data.get("full_name") if profile.data else None,
        "seller_avatar": profile.data.get("avatar_url") if profile.data else None,
        "generation_method": synthetic.data.get("generation_method") if synthetic.data else None,
        "row_count": synthetic.data.get("row_count") if synthetic.data else None,
        "column_count": synthetic.data.get("column_count") if synthetic.data else None,
        "privacy_score": privacy.data.get("overall_score") if privacy.data else None,
        "privacy_risk_level": privacy.data.get("risk_level") if privacy.data else None,
        "privacy_details": privacy.data.get("details") if privacy.data else None,
        "quality_score": quality.data.get("overall_score") if quality.data else None,
        "correlation_score": quality.data.get("correlation_score") if quality.data else None,
        "distribution_score": quality.data.get("distribution_score") if quality.data else None,
        "column_stats": quality.data.get("column_stats") if quality.data else None,
        "compliance_reports": compliance.data,
        "has_purchased": has_purchased,
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_marketplace_listing(
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """Create a new marketplace listing."""
    synthetic_dataset_id = body.get("synthetic_dataset_id")
    title = body.get("title")
    description = body.get("description")
    tags = body.get("tags", [])
    category = body.get("category")
    price = body.get("price")

    if not synthetic_dataset_id or not title or price is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="synthetic_dataset_id, title, and price are required",
        )

    supabase = get_supabase()

    synth_result = supabase.table("synthetic_datasets").select(
        "id,user_id,generation_method,row_count,column_count,status"
    ).eq("id", synthetic_dataset_id).single().execute()

    if not synth_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Synthetic dataset not found")

    if synth_result.data.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner of this dataset")

    if synth_result.data.get("status") != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Synthetic dataset is not ready")

    privacy_result = supabase.table("privacy_scores").select(
        "overall_score,risk_level"
    ).eq("synthetic_dataset_id", synthetic_dataset_id).single().execute()

    if not privacy_result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No privacy score available")

    if privacy_result.data.get("overall_score", 0) < 40:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Privacy score too low for marketplace")

    if privacy_result.data.get("risk_level") == "critical":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Critical risk datasets cannot be listed")

    compliance_result = supabase.table("compliance_reports").select(
        "passed"
    ).eq("synthetic_dataset_id", synthetic_dataset_id).execute()

    has_passed_compliance = any(r.get("passed") for r in compliance_result.data) if compliance_result.data else False

    if not has_passed_compliance:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Compliance report must pass before listing")

    preview_schema = body.get("preview_schema") or synth_result.data.get("preview_schema")

    listing = {
        "seller_id": user_id,
        "synthetic_dataset_id": synthetic_dataset_id,
        "title": title,
        "description": description,
        "tags": tags,
        "category": category,
        "price": price,
        "currency": "NGN",
        "is_active": True,
        "download_count": 0,
        "preview_schema": preview_schema,
        "generation_method": synth_result.data.get("generation_method"),
        "row_count": synth_result.data.get("row_count"),
        "column_count": synth_result.data.get("column_count"),
        "privacy_score": privacy_result.data.get("overall_score"),
        "privacy_risk_level": privacy_result.data.get("risk_level"),
    }

    result = supabase.table("marketplace_listings").insert(listing).execute()
    return result.data[0]


class CreateListingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    synthetic_dataset_id: str
    title: str
    description: Optional[str] = None
    tags: list[str] = []
    category: Optional[str] = None
    price: float
    preview_schema: Optional[dict] = None


class UpdateListingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    category: Optional[str] = None
    price: Optional[float] = None


class SellerListingResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    tags: Optional[list[str]]
    category: Optional[str]
    price: float
    currency: str
    is_active: bool
    download_count: int
    revenue: float
    generation_method: Optional[str]
    privacy_score: Optional[float]
    privacy_risk_level: Optional[str]
    created_at: str
    updated_at: Optional[str]


class SellerDashboardResponse(BaseModel):
    total_revenue: float
    revenue_this_month: float
    total_downloads: int
    best_selling_listing: Optional[SellerListingResponse]
    listings: list[SellerListingResponse]


@router.get("/my-listings", response_model=SellerDashboardResponse)
async def get_seller_listings(
    user_id: str = Depends(get_current_user),
):
    """Get seller's listings with revenue statistics."""
    supabase = get_supabase()

    listings_result = supabase.table("marketplace_listings").select(
        "id,title,description,tags,category,price,currency,is_active,download_count,"
        "generation_method,privacy_score,privacy_risk_level,created_at,updated_at"
    ).eq("seller_id", user_id).order("created_at", desc=True).execute()

    listings = []
    total_revenue = 0.0
    revenue_this_month = 0.0
    total_downloads = 0

    current_month = datetime.utcnow().strftime("%Y-%m")

    for row in listings_result.data:
        purchases_result = supabase.table("purchases").select(
            "amount,created_at"
        ).eq("listing_id", row["id"]).eq("status", "completed").execute()

        listing_revenue = sum(p.get("amount", 0) for p in purchases_result.data)
        total_revenue += listing_revenue
        total_downloads += row.get("download_count", 0)

        for p in purchases_result.data:
            purchase_date = p.get("created_at", "")
            if purchase_date.startswith(current_month):
                revenue_this_month += p.get("amount", 0)

        listings.append({
            **row,
            "revenue": listing_revenue,
        })

    best_selling = max(listings, key=lambda x: x["revenue"], default=None)

    return {
        "total_revenue": total_revenue,
        "revenue_this_month": revenue_this_month,
        "total_downloads": total_downloads,
        "best_selling_listing": best_selling,
        "listings": listings,
    }


@router.post("/listings", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_listing(
    body: CreateListingRequest,
    user_id: str = Depends(get_current_user),
):
    """Create a new marketplace listing."""
    supabase = get_supabase()

    synth_result = supabase.table("synthetic_datasets").select(
        "id,user_id,generation_method,row_count,column_count,status,preview_schema"
    ).eq("id", body.synthetic_dataset_id).single().execute()

    if not synth_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Synthetic dataset not found")

    if synth_result.data.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner of this dataset")

    if synth_result.data.get("status") != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Synthetic dataset is not ready")

    privacy_result = supabase.table("privacy_scores").select(
        "overall_score,risk_level"
    ).eq("synthetic_dataset_id", body.synthetic_dataset_id).single().execute()

    if not privacy_result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No privacy score available")

    if privacy_result.data.get("overall_score", 0) < 40:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Privacy score too low for marketplace")

    if privacy_result.data.get("risk_level") == "critical":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Critical risk datasets cannot be listed")

    compliance_result = supabase.table("compliance_reports").select(
        "passed"
    ).eq("synthetic_dataset_id", body.synthetic_dataset_id).execute()

    has_passed_compliance = any(r.get("passed") for r in compliance_result.data) if compliance_result.data else False

    if not has_passed_compliance:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Compliance report must pass before listing")

    listing = {
        "seller_id": user_id,
        "synthetic_dataset_id": body.synthetic_dataset_id,
        "title": body.title,
        "description": body.description,
        "tags": body.tags,
        "category": body.category,
        "price": body.price,
        "currency": "NGN",
        "is_active": True,
        "download_count": 0,
        "preview_schema": body.preview_schema or synth_result.data.get("preview_schema"),
        "generation_method": synth_result.data.get("generation_method"),
        "row_count": synth_result.data.get("row_count"),
        "column_count": synth_result.data.get("column_count"),
        "privacy_score": privacy_result.data.get("overall_score"),
        "privacy_risk_level": privacy_result.data.get("risk_level"),
    }

    result = supabase.table("marketplace_listings").insert(listing).execute()
    return result.data[0]


@router.patch("/listings/{listing_id}", response_model=dict)
async def update_listing(
    listing_id: str,
    body: UpdateListingRequest,
    user_id: str = Depends(get_current_user),
):
    """Update a marketplace listing."""
    supabase = get_supabase()

    existing = supabase.table("marketplace_listings").select(
        "id,seller_id"
    ).eq("id", listing_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if existing.data.get("seller_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner of this listing")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        return existing.data

    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = supabase.table("marketplace_listings").update(update_data).eq(
        "id", listing_id
    ).execute()
    return result.data[0]


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a marketplace listing."""
    supabase = get_supabase()

    existing = supabase.table("marketplace_listings").select(
        "id,seller_id"
    ).eq("id", listing_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if existing.data.get("seller_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner of this listing")

    supabase.table("marketplace_listings").delete().eq("id", listing_id).execute()


@router.patch("/listings/{listing_id}/toggle", response_model=dict)
async def toggle_listing(
    listing_id: str,
    user_id: str = Depends(get_current_user),
):
    """Activate or deactivate a marketplace listing."""
    supabase = get_supabase()

    existing = supabase.table("marketplace_listings").select(
        "id,seller_id,is_active"
    ).eq("id", listing_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if existing.data.get("seller_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owner of this listing")

    new_status = not existing.data.get("is_active", True)

    result = supabase.table("marketplace_listings").update(
        {"is_active": new_status, "updated_at": datetime.utcnow().isoformat()}
    ).eq("id", listing_id).execute()
    return result.data[0]


class PurchaseVerifyRequest(BaseModel):
    tx_ref: str


class PurchaseVerifyResponse(BaseModel):
    success: bool
    purchase_id: str
    listing_id: str
    download_url: Optional[str]
    message: str


@router.post("/purchases/verify", response_model=PurchaseVerifyResponse)
async def verify_purchase(
    body: PurchaseVerifyRequest,
    user_id: str = Depends(get_current_user),
):
    """Verify a Flutterwave payment and create purchase record."""
    from app.services.flutterwave import verify_payment
    from app.services.storage import get_signed_download_url
    from app.services.notifications import notify_purchase_made, notify_sale_made
    import httpx

    supabase = get_supabase()

    result = await verify_payment(body.tx_ref)

    if not result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message,
        )

    existing_purchase = supabase.table("purchases").select("id").eq(
        "flutterwave_tx_ref", body.tx_ref
    ).execute()

    if existing_purchase.data:
        purchase = existing_purchase.data[0]
        listing = supabase.table("marketplace_listings").select(
            "id,synthetic_dataset_id"
        ).eq("flutterwave_tx_ref", body.tx_ref).execute()

        signed_url = None
        if listing.data:
            signed_url = get_signed_download_url(
                listing.data[0]["synthetic_dataset_id"],
                "synthetic",
            )

        return {
            "success": True,
            "purchase_id": purchase["id"],
            "listing_id": listing.data[0]["id"] if listing.data else "",
            "download_url": signed_url,
            "message": "Purchase already recorded",
        }

    parsed = parse_tx_ref(body.tx_ref)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction reference",
        )

    listing = supabase.table("marketplace_listings").select(
        "id,synthetic_dataset_id,price,seller_id"
    ).eq("id", parsed["listingId"]).single().execute()

    if not listing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    if abs(result.amount - listing.data["price"]) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount does not match listing price",
        )

    purchase = {
        "buyer_id": user_id,
        "listing_id": listing.data["id"],
        "amount": result.amount,
        "currency": result.currency,
        "flutterwave_tx_ref": body.tx_ref,
        "flutterwave_tx_id": result.tx_id,
        "status": "completed",
    }

    purchase_result = supabase.table("purchases").insert(purchase).execute()

    supabase.table("marketplace_listings").update({
        "download_count": supabase.table("marketplace_listings").select("download_count")
        .eq("id", listing.data["id"]).single().execute().data.get("download_count", 0) + 1
    }).eq("id", listing.data["id"]).execute()

    # Send notifications to buyer and seller
    async with httpx.AsyncClient() as client:
        # Notify buyer
        await notify_purchase_made(
            user_id=user_id,
            listing_title=listing.data.get("title", "Dataset"),
            amount=str(listing.data["price"]),
            dataset_id=listing.data["synthetic_dataset_id"],
            http_client=client
        )
        # Notify seller (80% of amount = net earnings)
        net_amount = str(round(listing.data["price"] * 0.8, 2))
        await notify_sale_made(
            user_id=listing.data["seller_id"],
            title=listing.data.get("title", "Dataset"),
            net_amount=net_amount,
            http_client=client
        )

    signed_url = get_signed_download_url(
        listing.data["synthetic_dataset_id"],
        "synthetic",
    )

    return {
        "success": True,
        "purchase_id": purchase_result.data[0]["id"],
        "listing_id": listing.data["id"],
        "download_url": signed_url,
        "message": "Purchase completed successfully",
    }


class PurchaseHistoryItem(BaseModel):
    id: str
    listing_id: str
    listing_title: str
    amount: float
    currency: str
    status: str
    download_url: Optional[str]
    created_at: str


@router.get("/purchases/my-purchases", response_model=list[PurchaseHistoryItem])
async def get_my_purchases(
    user_id: str = Depends(get_current_user),
):
    """Get user's purchase history with download links."""
    from app.services.storage import get_signed_download_url

    supabase = get_supabase()

    purchases = supabase.table("purchases").select(
        "id,listing_id,amount,currency,status,flutterwave_tx_ref,created_at"
    ).eq("buyer_id", user_id).eq("status", "completed").order("created_at", desc=True).execute()

    results = []
    for purchase in purchases.data:
        listing = supabase.table("marketplace_listings").select(
            "id,title,synthetic_dataset_id"
        ).eq("id", purchase["listing_id"]).single().execute()

        signed_url = None
        if listing.data:
            signed_url = get_signed_download_url(
                listing.data["synthetic_dataset_id"],
                "synthetic",
            )

        results.append({
            "id": purchase["id"],
            "listing_id": purchase["listing_id"],
            "listing_title": listing.data.get("title", "Unknown") if listing.data else "Unknown",
            "amount": purchase["amount"],
            "currency": purchase["currency"],
            "status": purchase["status"],
            "download_url": signed_url,
            "created_at": purchase["created_at"],
        })

    return results


@router.get("/purchases/download/{listing_id}")
async def get_download_url(
    listing_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get fresh signed download URL for a purchased listing."""
    from app.services.storage import get_signed_download_url

    supabase = get_supabase()

    purchase = supabase.table("purchases").select(
        "id,status,synthetic_dataset_id"
    ).eq("listing_id", listing_id).eq("buyer_id", user_id).eq("status", "completed").execute()

    if not purchase.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have not purchased this dataset",
        )

    listing = supabase.table("marketplace_listings").select(
        "id,synthetic_dataset_id"
    ).eq("id", listing_id).single().execute()

    if not listing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    signed_url = get_signed_download_url(
        listing.data["synthetic_dataset_id"],
        "synthetic",
    )

    return {"download_url": signed_url}


def parse_tx_ref(tx_ref: str) -> Optional[dict]:
    """Parse transaction reference to extract user and listing IDs."""
    parts = tx_ref.split("-")
    if len(parts) != 5 or parts[0] != "SYNTHO":
        return None
    return {
        "userId": parts[1],
        "listingId": parts[2],
        "timestamp": int(parts[3]),
    }


class SellerRevenueResponse(BaseModel):
    total_earned: float
    pending: float
    this_month_earnings: float
    total_transactions: int
    platform_fee_deducted: float


@router.get("/seller/revenue", response_model=SellerRevenueResponse)
async def get_seller_revenue(
    user_id: str = Depends(get_current_user),
):
    """Get aggregated revenue statistics for seller."""
    supabase = get_supabase()

    purchases_result = supabase.table("purchases").select(
        "amount,status,created_at"
    ).eq("listing_id", "marketplace_listings.id").execute()

    listings_result = supabase.table("marketplace_listings").select(
        "id"
    ).eq("seller_id", user_id).execute()

    if not listings_result.data:
        return {
            "total_earned": 0,
            "pending": 0,
            "this_month_earnings": 0,
            "total_transactions": 0,
            "platform_fee_deducted": 0,
        }

    listing_ids = [l["id"] for l in listings_result.data]

    all_purchases = supabase.table("purchases").select(
        "amount,status,created_at"
    ).in_("listing_id", listing_ids).eq("status", "completed").execute()

    current_month = datetime.utcnow().strftime("%Y-%m")
    total_earned = 0.0
    pending = 0.0
    this_month_earnings = 0.0
    platform_fee_deducted = 0.0

    for purchase in all_purchases.data:
        amount = purchase.get("amount", 0)
        status = purchase.get("status", "pending")
        created_at = purchase.get("created_at", "")

        if status == "completed":
            seller_amount = amount * 0.8
            total_earned += seller_amount
            platform_fee_deducted += amount * 0.2

            if created_at.startswith(current_month):
                this_month_earnings += seller_amount
        elif status == "pending":
            pending += amount * 0.8

    return {
        "total_earned": total_earned,
        "pending": pending,
        "this_month_earnings": this_month_earnings,
        "total_transactions": len(all_purchases.data),
        "platform_fee_deducted": platform_fee_deducted,
    }


class SellerTransactionResponse(BaseModel):
    id: str
    buyer_anonymized: str
    amount: float
    seller_amount: float
    platform_fee: float
    status: str
    created_at: str
    listing_title: str


@router.get("/seller/transactions", response_model=list[SellerTransactionResponse])
async def get_seller_transactions(
    user_id: str = Depends(get_current_user),
):
    """Get transaction history for seller."""
    supabase = get_supabase()

    listings_result = supabase.table("marketplace_listings").select("id").eq("seller_id", user_id).execute()

    if not listings_result.data:
        return []

    listing_ids = [l["id"] for l in listings_result.data]

    purchases = supabase.table("purchases").select(
        "id,buyer_id,listing_id,amount,status,created_at"
    ).in_("listing_id", listing_ids).eq("status", "completed").order("created_at", desc=True).execute()

    results = []
    for purchase in purchases.data:
        listing = supabase.table("marketplace_listings").select("title").eq("id", purchase["listing_id"]).single().execute()

        buyer_id = purchase.get("buyer_id", "")
        buyer_anonymized = f"User_{buyer_id[:8]}" if buyer_id else "Anonymous"

        amount = purchase.get("amount", 0)
        seller_amount = amount * 0.8
        platform_fee = amount * 0.2

        results.append({
            "id": purchase["id"],
            "buyer_anonymized": buyer_anonymized,
            "amount": amount,
            "seller_amount": seller_amount,
            "platform_fee": platform_fee,
            "status": purchase.get("status", "pending"),
            "created_at": purchase.get("created_at", ""),
            "listing_title": listing.data.get("title", "Unknown") if listing.data else "Unknown",
        })

    return results


class PayoutSetupRequest(BaseModel):
    bank_code: str
    account_number: str
    business_name: str


@router.post("/seller/payout-setup")
async def setup_seller_payout(
    body: PayoutSetupRequest,
    user_id: str = Depends(get_current_user),
):
    """Set up seller payout with Flutterwave subaccount."""
    from app.services.flutterwave import create_subaccount, verify_account_number

    supabase = get_supabase()

    profile_result = supabase.table("profiles").select("email,full_name").eq("id", user_id).single().execute()

    if not profile_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    email = profile_result.data.get("email")
    full_name = profile_result.data.get("full_name") or body.business_name

    account_verification = await verify_account_number(body.account_number, body.bank_code)

    if account_verification.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=account_verification.get("message", "Account verification failed"),
        )

    subaccount_result = await create_subaccount(
        bank_code=body.bank_code,
        account_number=body.account_number,
        business_name=body.business_name,
        email=email,
    )

    if subaccount_result.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=subaccount_result.get("message", "Failed to create subaccount"),
        )

    update_result = supabase.table("profiles").update({
        "flutterwave_subaccount_id": subaccount_result.get("subaccount_id"),
        "bank_account_verified": True,
    }).eq("id", user_id).execute()

    return {
        "status": "success",
        "subaccount_id": subaccount_result.get("subaccount_id"),
        "subaccount_code": subaccount_result.get("subaccount_code"),
        "message": "Payout setup completed successfully",
    }


@router.get("/seller/payout-status")
async def get_seller_payout_status(
    user_id: str = Depends(get_current_user),
):
    """Get seller's payout setup status."""
    supabase = get_supabase()

    profile = supabase.table("profiles").select(
        "flutterwave_subaccount_id,bank_account_verified"
    ).eq("id", user_id).single().execute()

    if not profile.data:
        return {"is_setup": False}

    return {
        "is_setup": bool(profile.data.get("flutterwave_subaccount_id")),
        "subaccount_id": profile.data.get("flutterwave_subaccount_id"),
        "bank_account_verified": profile.data.get("bank_account_verified", False),
    }


@router.get("/banks")
async def get_banks(
    country: str = Query("NG", max_length=2),
):
    """Get list of banks for payout setup."""
    from app.services.flutterwave import list_banks

    result = await list_banks(country)

    if result.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Failed to fetch banks"),
        )

    return {"banks": result.get("data", [])}


@router.post("/verify-account")
async def verify_account(
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """Verify bank account number."""
    from app.services.flutterwave import verify_account_number

    account_number = body.get("account_number")
    bank_code = body.get("bank_code")

    if not account_number or not bank_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="account_number and bank_code are required",
        )

    result = await verify_account_number(account_number, bank_code)

    if result.get("status") != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Account verification failed"),
        )

    return result