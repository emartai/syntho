from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from modal_ml.utils import supabase_client, upload_to_storage

INDIGO = colors.HexColor("#4F46E5")
GREEN = colors.HexColor("#16A34A")
RED = colors.HexColor("#DC2626")

DIRECT_IDENTIFIER_PATTERNS = {
    "name": re.compile(r"\b(name|first_name|last_name|fullname|full_name)\b", re.IGNORECASE),
    "email": re.compile(r"\b(email|e-mail)\b", re.IGNORECASE),
    "id": re.compile(r"\b(id|user_id|customer_id|patient_id|identifier)\b", re.IGNORECASE),
}

SPECIAL_CATEGORY_PATTERNS = re.compile(
    r"\b(health|medical|diagnosis|religion|faith|political|politics|ethnicity|sexual)\b", re.IGNORECASE
)

HIPAA_PHI_PATTERNS = re.compile(
    r"\b(name|address|date|phone|fax|email|ssn|social|mrn|medical\s*record|health\s*plan|account|"
    r"certificate|license|vin|vehicle|device|url|ip|biometric|photo|image|identifier)\b",
    re.IGNORECASE,
)


def _contains_pattern(series: pd.Series, pattern: re.Pattern[str], sample_size: int = 80) -> bool:
    sample = series.dropna().astype(str)
    if sample.empty:
        return False
    return sample.head(sample_size).str.contains(pattern, na=False).any()


def _evaluate_gdpr(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    privacy_score: float,
    privacy_score_result: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[str], bool]:
    checks: list[dict[str, Any]] = []
    findings: list[str] = []

    direct_identifier_columns = [
        col
        for col in synthetic_df.columns
        if any(pat.search(col) for pat in DIRECT_IDENTIFIER_PATTERNS.values())
        or _contains_pattern(synthetic_df[col], re.compile(r"@|\b\d{3}-\d{2}-\d{4}\b"))
    ]
    no_direct_identifiers = len(direct_identifier_columns) == 0
    checks.append(
        {
            "name": "No direct identifiers (names, emails, IDs) in synthetic data",
            "passed": no_direct_identifiers,
            "explanation": "No direct identifier signals detected."
            if no_direct_identifiers
            else f"Potential direct identifiers found in columns: {', '.join(direct_identifier_columns)}.",
        }
    )
    if not no_direct_identifiers:
        findings.append("Direct identifiers detected in synthetic data columns.")

    quasi_identifier_safe = privacy_score > 60
    checks.append(
        {
            "name": "No quasi-identifiers that allow re-identification",
            "passed": quasi_identifier_safe,
            "explanation": f"Privacy score is {privacy_score:.1f}; required > 60.",
        }
    )
    if not quasi_identifier_safe:
        findings.append("Privacy score indicates elevated quasi-identifier re-identification risk.")

    original_cols = set(original_df.columns)
    synthetic_cols = set(synthetic_df.columns)
    data_minimization = synthetic_cols.issubset(original_cols) and len(synthetic_cols) <= len(original_cols)
    checks.append(
        {
            "name": "Data minimization: synthetic columns limited to what's needed",
            "passed": data_minimization,
            "explanation": "Synthetic schema is constrained to original schema."
            if data_minimization
            else "Synthetic schema contains extra or unnecessary columns.",
        }
    )
    if not data_minimization:
        findings.append("Synthetic dataset contains columns outside the expected minimized schema.")

    special_columns = [col for col in synthetic_df.columns if SPECIAL_CATEGORY_PATTERNS.search(col)]
    special_flag = bool(privacy_score_result.get("allow_special_category_data", False))
    no_special_without_flag = not special_columns or special_flag
    checks.append(
        {
            "name": "No special category data without explicit flag",
            "passed": no_special_without_flag,
            "explanation": "No special-category columns detected or explicit flag provided."
            if no_special_without_flag
            else f"Special category columns detected ({', '.join(special_columns)}) without explicit allow flag.",
        }
    )
    if not no_special_without_flag:
        findings.append("Special-category data appears without explicit processing flag.")

    linkability_risk = float(
        privacy_score_result.get("linkability_risk")
        or privacy_score_result.get("details", {}).get("linkability_risk", {}).get("max_overlap_ratio", 0)
        or 0
    )
    non_traceable = privacy_score > 60 and linkability_risk <= 0.05
    checks.append(
        {
            "name": "Synthetic data cannot be traced back to individuals",
            "passed": non_traceable,
            "explanation": f"Privacy score {privacy_score:.1f}; overlap ratio {linkability_risk:.3f} (must be <= 0.05).",
        }
    )
    if not non_traceable:
        findings.append("Linkability overlap suggests possible trace-back to real records.")

    return checks, findings, all(item["passed"] for item in checks)


def _evaluate_hipaa(
    synthetic_df: pd.DataFrame,
    privacy_score: float,
    privacy_score_result: dict[str, Any],
) -> tuple[bool, list[dict[str, Any]], list[str], bool]:
    health_data_detected = any(
        re.search(r"\b(health|medical|patient|diagnosis|treatment|hospital|clinic|mrn)\b", col, re.IGNORECASE)
        for col in synthetic_df.columns
    )

    checks: list[dict[str, Any]] = []
    findings: list[str] = []

    if not health_data_detected:
        return health_data_detected, checks, findings, True

    phi_columns = [
        col
        for col in synthetic_df.columns
        if HIPAA_PHI_PATTERNS.search(col)
        or _contains_pattern(synthetic_df[col], re.compile(r"@|\b\d{3}-\d{2}-\d{4}\b|\b\d{10}\b"))
    ]
    no_phi = len(phi_columns) == 0
    checks.append(
        {
            "name": "No PHI present in synthetic dataset",
            "passed": no_phi,
            "explanation": "No PHI patterns detected."
            if no_phi
            else f"Potential PHI-related fields detected: {', '.join(phi_columns)}.",
        }
    )
    if not no_phi:
        findings.append("Potential PHI detected in health dataset.")

    method = str(
        privacy_score_result.get("hipaa_method") or privacy_score_result.get("deidentification_method") or ""
    ).lower()
    method_applied = method in {"expert_determination", "safe_harbor"}
    checks.append(
        {
            "name": "Expert determination or safe harbor method applied",
            "passed": method_applied,
            "explanation": "HIPAA de-identification method recorded."
            if method_applied
            else "No recognized HIPAA de-identification method found in metadata.",
        }
    )
    if not method_applied:
        findings.append("HIPAA requires documenting Expert Determination or Safe Harbor method.")

    deidentified = privacy_score > 70
    checks.append(
        {
            "name": "De-identification verified",
            "passed": deidentified,
            "explanation": f"Privacy score is {privacy_score:.1f}; required > 70 for HIPAA.",
        }
    )
    if not deidentified:
        findings.append("Privacy score below HIPAA de-identification threshold.")

    return health_data_detected, checks, findings, all(item["passed"] for item in checks)


def generate_compliance_report(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    privacy_score_result: dict[str, Any],
    synthetic_dataset_id: str,
    report_type: str = "combined",
) -> bytes:
    privacy_score = float(privacy_score_result.get("overall_score", 0) or 0)

    gdpr_checks, gdpr_findings, gdpr_passed = _evaluate_gdpr(
        original_df=original_df,
        synthetic_df=synthetic_df,
        privacy_score=privacy_score,
        privacy_score_result=privacy_score_result,
    )

    health_data_detected, hipaa_checks, hipaa_findings, hipaa_passed = _evaluate_hipaa(
        synthetic_df=synthetic_df,
        privacy_score=privacy_score,
        privacy_score_result=privacy_score_result,
    )

    all_findings = gdpr_findings + hipaa_findings
    overall_passed = gdpr_passed and hipaa_passed

    recommendations: list[str] = []
    if not gdpr_passed:
        recommendations.append("Remove direct identifiers and reduce quasi-identifier uniqueness before release.")
        recommendations.append("Review data minimization and remove non-essential columns.")
    if health_data_detected and not hipaa_passed:
        recommendations.append("Apply Safe Harbor or Expert Determination and document the selected method.")
        recommendations.append("Strip residual PHI signals and regenerate synthetic output.")
    if not recommendations:
        recommendations.append("Maintain current controls and rerun compliance scans after each regeneration cycle.")

    pdf = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title="Syntho GDPR/HIPAA Compliance Report",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("SynthoTitle", parent=styles["Title"], textColor=INDIGO, fontSize=24)
    h2_style = ParagraphStyle("SynthoH2", parent=styles["Heading2"], textColor=INDIGO, spaceBefore=10, spaceAfter=6)
    body_style = styles["BodyText"]

    story: list[Any] = []
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    story.extend(
        [
            Paragraph("Syntho", title_style),
            Spacer(1, 10),
            Paragraph("Automated GDPR & HIPAA Compliance Report", styles["Heading1"]),
            Spacer(1, 8),
            Paragraph(f"Dataset: {synthetic_dataset_id}", body_style),
            Paragraph(f"Generated: {generated_at}", body_style),
            Spacer(1, 24),
            Paragraph("Executive Summary", h2_style),
            Paragraph(
                f"Overall result: <b>{'PASS ✅' if overall_passed else 'FAIL ❌'}</b> — Privacy score: <b>{privacy_score:.1f}</b>.",
                body_style,
            ),
            Spacer(1, 12),
        ]
    )

    def _build_check_table(section_checks: list[dict[str, Any]]) -> Table:
        rows = [["Status", "Check", "Explanation"]]
        for item in section_checks:
            rows.append(["✅" if item["passed"] else "❌", item["name"], item["explanation"]])
        table = Table(rows, colWidths=[18 * mm, 62 * mm, 95 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ]
            )
        )
        return table

    if report_type in {"gdpr", "combined"}:
        story.extend([Paragraph("GDPR Compliance", h2_style), _build_check_table(gdpr_checks), Spacer(1, 10)])

    if report_type in {"hipaa", "combined"}:
        story.append(Paragraph("HIPAA Compliance", h2_style))
        if health_data_detected:
            story.extend([_build_check_table(hipaa_checks), Spacer(1, 10)])
        else:
            story.extend(
                [
                    Paragraph(
                        "Health data not detected; HIPAA checks are not required for this dataset.",
                        body_style,
                    ),
                    Spacer(1, 10),
                ]
            )

    story.append(Paragraph("Risk Findings", h2_style))
    if all_findings:
        for finding in all_findings:
            story.append(Paragraph(f"• {finding}", body_style))
    else:
        story.append(Paragraph("• No material compliance issues detected.", body_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Recommendations", h2_style))
    for recommendation in recommendations:
        story.append(Paragraph(f"• {recommendation}", body_style))

    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            f"<font color='{GREEN if overall_passed else RED}'>Generated by Syntho — For informational purposes only</font>",
            body_style,
        )
    )

    doc.build(story)
    pdf_bytes = pdf.getvalue()

    file_path = f"reports/{synthetic_dataset_id}/compliance.pdf"
    upload_to_storage("reports", file_path, pdf_bytes, "application/pdf")

    findings_payload = {
        "overall_score": privacy_score,
        "gdpr_checks": gdpr_checks,
        "hipaa_checks": hipaa_checks if health_data_detected else [],
        "health_data_detected": health_data_detected,
        "issues": all_findings,
        "recommendations": recommendations,
    }

    supabase_client().table("compliance_reports").insert(
        {
            "synthetic_dataset_id": synthetic_dataset_id,
            "report_type": report_type,
            "file_path": file_path,
            "passed": overall_passed,
            "gdpr_passed": gdpr_passed,
            "hipaa_passed": hipaa_passed if health_data_detected else True,
            "findings": findings_payload,
        }
    ).execute()

    return pdf_bytes


def compliance_reporter(
    original_df: pd.DataFrame,
    synthetic_df: pd.DataFrame,
    context: dict[str, Any] | None = None,
) -> bytes:
    context = context or {}
    synthetic_dataset_id = str(context.get("synthetic_dataset_id") or context.get("payload", {}).get("synthetic_dataset_id"))
    if not synthetic_dataset_id:
        raise ValueError("synthetic_dataset_id is required in context")

    report_type = str(context.get("report_type") or "combined")

    privacy_record = (
        supabase_client()
        .table("privacy_scores")
        .select("*")
        .eq("synthetic_dataset_id", synthetic_dataset_id)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    privacy_score_result = privacy_record.data or {}

    return generate_compliance_report(
        original_df=original_df,
        synthetic_df=synthetic_df,
        privacy_score_result=privacy_score_result,
        synthetic_dataset_id=synthetic_dataset_id,
        report_type=report_type,
    )
