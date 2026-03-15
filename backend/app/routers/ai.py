"""AI endpoints for Groq-powered features."""
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
import json
from app.middleware.auth import get_current_user
from app.services.supabase import get_supabase
from app.services.ai_advisor import (
    analyze_schema,
    explain_compliance,
    write_listing_copy,
    advise_quality,
    search_listings
)


router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


def require_auth(authorization: str = Header(...)) -> str:
    """Dependency to require authentication."""
    return get_current_user(authorization)


@router.post("/recommend-method/{dataset_id}")
async def recommend_generation_method(
    dataset_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Trigger analyze_schema for a dataset.
    Returns AI recommendation for generation method.
    """
    supabase = get_supabase()
    
    # Get dataset
    dataset = supabase.table("datasets").select("*").eq("id", dataset_id).eq("user_id", user_id).single()
    if not dataset.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    schema = dataset.data.get("schema", {})
    
    # Get sample rows from storage or metadata
    sample_rows = schema.get("sample_rows", [])
    
    # Get existing recommendation
    existing = schema.get("ai_recommendation")
    if existing:
        return {"recommendation": existing, "cached": True}
    
    # Generate recommendation
    recommendation = await analyze_schema(schema, sample_rows)
    
    if recommendation:
        # Save to dataset schema
        schema["ai_recommendation"] = recommendation
        supabase.table("datasets").update({"schema": schema}).eq("id", dataset_id).execute()
        return {"recommendation": recommendation, "cached": False}
    
    raise HTTPException(status_code=500, detail="Failed to generate recommendation")


@router.post("/explain-compliance/{report_id}")
async def explain_compliance_report(
    report_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Trigger explain_compliance for a compliance report.
    Returns plain English explanation of findings.
    """
    supabase = get_supabase()
    
    # Get report
    report = supabase.table("compliance_reports").select("*, synthetic_datasets(user_id)").eq("id", report_id).single()
    if not report.data:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.data["synthetic_datasets"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    findings = report.data.get("findings", [])
    passed = report.data.get("passed", False)
    
    # Check existing explanation
    existing = findings.get("ai_explanation") if isinstance(findings, dict) else None
    if existing:
        return {"explanation": existing, "cached": True}
    
    # Generate explanation
    explanation = await explain_compliance(findings, passed)
    
    if explanation:
        # Save to findings
        if isinstance(findings, dict):
            findings["ai_explanation"] = explanation
        else:
            findings = {"ai_explanation": explanation, "items": findings}
        supabase.table("compliance_reports").update({"findings": findings}).eq("id", report_id).execute()
        return {"explanation": explanation, "cached": False}
    
    raise HTTPException(status_code=500, detail="Failed to generate explanation")


@router.post("/listing-copy")
async def generate_listing_copy(
    synthetic_dataset_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Trigger write_listing_copy for a synthetic dataset.
    Returns title, description, and tags for marketplace listing.
    """
    supabase = get_supabase()
    
    # Get synthetic dataset with original dataset info
    synth = supabase.table("synthetic_datasets").select(
        "*, datasets(name, schema, row_count)"
    ).eq("id", synthetic_dataset_id).single()
    
    if not synth.data:
        raise HTTPException(status_code=404, detail="Synthetic dataset not found")
    
    if synth.data["datasets"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    dataset_name = synth.data["datasets"]["name"]
    schema = synth.data["datasets"]["schema"] or {}
    row_count = synth.data["datasets"]["row_count"] or 0
    
    # Get privacy score
    privacy = supabase.table("privacy_scores").select("overall_score").eq(
        "synthetic_dataset_id", synthetic_dataset_id
    ).single().data
    
    privacy_score = privacy["overall_score"] if privacy else 0
    
    # Generate listing copy
    result = await write_listing_copy(
        dataset_name=dataset_name,
        schema=schema,
        row_count=row_count,
        privacy_score=privacy_score,
        category="synthetic-data"
    )
    
    if result:
        return result
    
    raise HTTPException(status_code=500, detail="Failed to generate listing copy")


@router.post("/quality-advice/{quality_report_id}")
async def get_quality_advice(
    quality_report_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Trigger advise_quality if overall_score < 70.
    Returns actionable advice to improve quality.
    """
    supabase = get_supabase()
    
    # Get report
    report = supabase.table("quality_reports").select(
        "*, synthetic_datasets(user_id, generation_method)"
    ).eq("id", quality_report_id).single()
    
    if not report.data:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.data["synthetic_datasets"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    overall_score = report.data.get("overall_score", 0)
    
    if overall_score >= 70:
        return {"advice": None, "reason": "score_above_threshold"}
    
    # Check existing advice
    column_stats = report.data.get("column_stats", {})
    existing = column_stats.get("ai_advice") if isinstance(column_stats, dict) else None
    if existing:
        return {"advice": existing, "cached": True}
    
    # Generate advice
    generation_method = report.data["synthetic_datasets"]["generation_method"]
    advice = await advise_quality(report.data, generation_method)
    
    if advice:
        # Save to column_stats
        if isinstance(column_stats, dict):
            column_stats["ai_advice"] = advice
        else:
            column_stats = {"ai_advice": advice}
        supabase.table("quality_reports").update({"column_stats": column_stats}).eq("id", quality_report_id).execute()
        return {"advice": advice, "cached": False}
    
    raise HTTPException(status_code=500, detail="Failed to generate advice")


@router.get("/search")
async def search_marketplace(
    q: str,
    user_id: str = Depends(require_auth)
):
    """
    Trigger search_listings for marketplace search.
    Returns filtered listing IDs.
    """
    supabase = get_supabase()
    
    # Get active listings
    listings = supabase.table("marketplace_listings").select(
        "id, title, category, tags"
    ).eq("is_active", True).execute().data
    
    # Search using AI
    results = await search_listings(q, listings)
    
    return {"results": results, "query": q}