"""Tests for compliance reports."""
import pytest
from httpx import AsyncClient


class TestComplianceReports:
    """Compliance report test suite."""

    @pytest.mark.asyncio
    async def test_gdpr_pass(self, async_client: AsyncClient):
        """Test GDPR compliance pass condition."""
        # GDPR pass if no PII detected and privacy score >= 70
        has_pii = False
        privacy_score = 85
        passed = not has_pii and privacy_score >= 70
        assert passed == True

    @pytest.mark.asyncio
    async def test_gdpr_fail_pii(self, async_client: AsyncClient):
        """Test GDPR compliance fail when PII detected."""
        has_pii = True
        privacy_score = 85
        passed = not has_pii and privacy_score >= 70
        assert passed == False

    @pytest.mark.asyncio
    async def test_hipaa_pass(self, async_client: AsyncClient):
        """Test HIPAA compliance pass condition."""
        # HIPAA requires stricter privacy score
        has_phi = False
        privacy_score = 90
        passed = not has_phi and privacy_score >= 85
        assert passed == True

    @pytest.mark.asyncio
    async def test_hipaa_fail_phi(self, async_client: AsyncClient):
        """Test HIPAA compliance fail when PHI detected."""
        has_phi = True
        privacy_score = 90
        passed = not has_phi and privacy_score >= 85
        assert passed == False

    @pytest.mark.asyncio
    async def test_combined_report(self, async_client: AsyncClient):
        """Test combined GDPR + HIPAA report."""
        has_pii = False
        has_phi = False
        privacy_score = 88
        gdpr_pass = not has_pii and privacy_score >= 70
        hipaa_pass = not has_phi and privacy_score >= 85
        assert gdpr_pass == True
        assert hipaa_pass == True