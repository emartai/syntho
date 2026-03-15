"""AI advisor service with 5 intelligent features triggered by pipeline events."""
import json
from typing import Any
from app.lib.groq_client import ask_groq


async def analyze_schema(dataset_schema: dict, sample_rows: list) -> dict | None:
    """
    Analyze dataset schema and recommend generation method.
    Called after dataset upload completes (status -> 'ready').
    """
    system_prompt = """You are a synthetic data expert. Given a dataset schema and sample rows, recommend the best generation method and config. Return ONLY JSON."""
    
    user_prompt = f"""Schema: {json.dumps(dataset_schema)}
Sample (5 rows): {json.dumps(sample_rows[:5])}
Return ONLY JSON: {{method: 'ctgan'|'tvae'|'gaussian_copula', epochs: int, batch_size: int, reason: str (max 2 sentences)}}"""
    
    response = await ask_groq(system_prompt, user_prompt, max_tokens=300)
    if response:
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return None
    return None


async def explain_compliance(report_findings: list, passed: bool) -> str | None:
    """
    Explain compliance findings in plain English.
    Called after compliance_reports row is inserted.
    """
    system_prompt = """You are a GDPR and HIPAA compliance expert. Explain findings in plain English for a non-technical user. Be concise and actionable."""
    
    user_prompt = f"""Passed: {passed}
Findings: {json.dumps(report_findings)}
Write 3-5 sentences explaining what passed, what failed, and what the user should do."""
    
    return await ask_groq(system_prompt, user_prompt, max_tokens=400)


async def write_listing_copy(
    dataset_name: str,
    schema: dict,
    row_count: int,
    privacy_score: float,
    category: str
) -> dict | None:
    """
    Generate marketplace listing copy.
    Called when user clicks "List on Marketplace".
    """
    system_prompt = """You are a data marketplace copywriter. Write compelling, accurate listing copy."""
    
    column_names = list(schema.get("columns", {}).keys()) if isinstance(schema, dict) else []
    
    user_prompt = f"""Dataset: {dataset_name}
Columns: {json.dumps(column_names)}
Rows: {row_count}
Privacy score: {privacy_score}/100
Category: {category}
Return ONLY JSON: {{title: str (max 80 chars), description: str (max 300 chars), tags: list[str] (5 tags)}}"""
    
    response = await ask_groq(system_prompt, user_prompt, max_tokens=400)
    if response:
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return None
    return None


async def advise_quality(quality_report: dict, generation_method: str) -> str | None:
    """
    Give actionable advice to improve synthetic data quality.
    Called after quality_reports row is inserted and overall_score < 70.
    """
    system_prompt = """You are a synthetic data quality expert. Give specific, actionable advice."""
    
    scores = {
        "correlation": quality_report.get("correlation_score"),
        "distribution": quality_report.get("distribution_score"),
        "overall": quality_report.get("overall_score")
    }
    
    user_prompt = f"""Generation method: {generation_method}
Quality scores: {json.dumps(scores)}
Overall: {quality_report.get('overall_score')}/100
Write 2-4 bullet points on exactly how to improve quality. Start each with •"""
    
    return await ask_groq(system_prompt, user_prompt, max_tokens=300)


async def search_listings(query: str, available_listings: list) -> list[str]:
    """
    Search marketplace listings using AI.
    Called when user types in marketplace search bar (debounced).
    """
    if not query.strip() or not available_listings:
        return []
    
    system_prompt = """You are a search engine for a synthetic data marketplace. Return matching listing IDs only."""
    
    listings_summary = [
        {"id": lst["id"], "title": lst.get("title", ""), "category": lst.get("category", ""), "tags": lst.get("tags", [])}
        for lst in available_listings
    ]
    
    user_prompt = f"""Query: '{query}'
Listings: {json.dumps(listings_summary)}
Return ONLY a JSON array of listing IDs that best match the query. Max 20 results."""
    
    response = await ask_groq(system_prompt, user_prompt, max_tokens=500)
    if response:
        try:
            result = json.loads(response)
            if isinstance(result, list):
                return [lid for lid in result if isinstance(lid, str)]
        except json.JSONDecodeError:
            pass
    return []