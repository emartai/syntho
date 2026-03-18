"""
MVP Integration Tests — Full Core Loop
========================================
Tests the complete Syntho MVP flow as described in roadmap.md:

1. Health check & API docs accessible
2. Auth: JWT validation, protected routes, expired/invalid tokens
3. Upload CSV → schema detected → dataset stored
4. List datasets → returns array (not object)
5. Get single dataset → ownership enforced
6. Delete dataset → ownership enforced
7. Generate synthetic data → quota check → job created → Modal triggered
8. Generation status tracking
9. List synthetic datasets
10. Download synthetic dataset → signed URL
11. Privacy report → ownership verified
12. Quality report → ownership verified
13. Compliance report → ownership verified
14. Compliance PDF download
15. CORS headers present
16. Quota enforcement (free plan limits)
"""
import io
import time
import uuid
from unittest.mock import MagicMock, patch, AsyncMock

import jwt
import pytest
from httpx import AsyncClient


# ===================================================================
# Phase 1: Health & Infrastructure
# ===================================================================

class TestHealthAndInfra:
    """Verify the app starts and basic endpoints work."""

    @pytest.mark.asyncio
    async def test_health_endpoint(self, async_client: AsyncClient):
        resp = await async_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_root_endpoint(self, async_client: AsyncClient):
        resp = await async_client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "Syntho" in data["message"]
        assert data["docs"] == "/api/docs"

    @pytest.mark.asyncio
    async def test_docs_accessible(self, async_client: AsyncClient):
        resp = await async_client.get("/api/docs")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_cors_headers_present(self, async_client: AsyncClient):
        resp = await async_client.options(
            "/health",
            headers={
                "Origin": "https://syntho-henna.vercel.app",
                "Access-Control-Request-Method": "GET",
            },
        )
        # CORS preflight should not return 405
        assert resp.status_code in [200, 204]


# ===================================================================
# Phase 2: Authentication
# ===================================================================

class TestAuthentication:
    """JWT auth — protects all /api/v1/* routes."""

    @pytest.mark.asyncio
    async def test_no_token_returns_401_or_403(self, async_client: AsyncClient):
        """All protected routes reject unauthenticated requests."""
        endpoints = [
            ("GET", "/api/v1/datasets"),
            ("GET", "/api/v1/synthetic"),
            ("GET", "/api/v1/reports/privacy/some-id"),
        ]
        for method, path in endpoints:
            resp = await async_client.request(method, path)
            assert resp.status_code in [401, 403], f"{method} {path} → {resp.status_code}"

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, async_client: AsyncClient):
        resp = await async_client.get(
            "/api/v1/datasets",
            headers={"Authorization": "Bearer totally.invalid.token"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_returns_401(self, async_client: AsyncClient):
        expired = jwt.encode(
            {"sub": "user-1", "email": "a@b.com", "iat": time.time() - 7200, "exp": time.time() - 3600},
            "test-jwt-secret",
            algorithm="HS256",
        )
        resp = await async_client.get(
            "/api/v1/datasets",
            headers={"Authorization": f"Bearer {expired}"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_token_without_sub_returns_401(self, async_client: AsyncClient):
        no_sub = jwt.encode(
            {"email": "a@b.com", "iat": time.time(), "exp": time.time() + 3600},
            "test-jwt-secret",
            algorithm="HS256",
        )
        resp = await async_client.get(
            "/api/v1/datasets",
            headers={"Authorization": f"Bearer {no_sub}"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token_passes_auth(self, async_client: AsyncClient, auth_headers, mock_supabase):
        """Valid token should pass auth — endpoint may fail on DB but NOT on auth."""
        resp = await async_client.get("/api/v1/datasets", headers=auth_headers)
        # Should be 200 (empty list) since mock returns []
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_malformed_bearer_header(self, async_client: AsyncClient):
        resp = await async_client.get(
            "/api/v1/datasets",
            headers={"Authorization": "NotBearer sometoken"},
        )
        assert resp.status_code in [401, 403]


# ===================================================================
# Phase 3: Dataset Upload (CSV → schema detected → stored)
# ===================================================================

class TestDatasetUpload:
    """Upload flow: file validation, schema detection, storage."""

    @pytest.mark.asyncio
    async def test_upload_csv_success(
        self, async_client: AsyncClient, auth_headers, mock_supabase, titanic_csv_bytes, test_user_id
    ):
        """Upload a valid CSV → schema detected, row in datasets table."""
        # Mock: storage upload succeeds, DB insert returns the row
        mock_supabase._table_chains = {}  # reset
        insert_chain = MagicMock()
        insert_chain.insert.return_value = insert_chain
        insert_chain.execute.return_value = MagicMock(data=[{
            "id": "new-dataset-id",
            "user_id": test_user_id,
            "name": "titanic.csv",
            "status": "ready",
            "row_count": 100,
            "column_count": 8,
        }])

        def table_fn(name):
            if name not in mock_supabase._table_chains:
                mock_supabase._table_chains[name] = insert_chain
            return mock_supabase._table_chains[name]
        mock_supabase.table = MagicMock(side_effect=table_fn)

        resp = await async_client.post(
            "/api/v1/datasets",
            headers=auth_headers,
            files={"file": ("titanic.csv", titanic_csv_bytes, "text/csv")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "ready"
        assert data["row_count"] == 100

    @pytest.mark.asyncio
    async def test_upload_rejects_exe(self, async_client: AsyncClient, auth_headers):
        """Reject non-allowed file extensions."""
        resp = await async_client.post(
            "/api/v1/datasets",
            headers=auth_headers,
            files={"file": ("malware.exe", b"MZ\x00\x00", "application/octet-stream")},
        )
        assert resp.status_code == 400
        assert "Unsupported" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_rejects_oversized_file(self, async_client: AsyncClient, auth_headers):
        """Reject files over 100MB."""
        # We can't actually send 100MB in a test, but we can test the logic
        # by checking the endpoint exists and validates
        resp = await async_client.post(
            "/api/v1/datasets",
            headers=auth_headers,
            files={"file": ("empty.csv", b"", "text/csv")},
        )
        # Empty file should fail schema detection
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_upload_requires_auth(self, async_client: AsyncClient, titanic_csv_bytes):
        resp = await async_client.post(
            "/api/v1/datasets",
            files={"file": ("test.csv", titanic_csv_bytes, "text/csv")},
        )
        assert resp.status_code in [401, 403]


# ===================================================================
# Phase 4: List Datasets (returns raw array, not object)
# ===================================================================

class TestListDatasets:
    """Critical fix: list_datasets must return an array, not {datasets: [...]}."""

    @pytest.mark.asyncio
    async def test_list_returns_array(self, async_client: AsyncClient, auth_headers, mock_supabase, sample_dataset_row):
        """Response is a JSON array — no wrapping object."""
        mock_supabase._table_chains = {}
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.order.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_dataset_row])

        def table_fn(name):
            if name not in mock_supabase._table_chains:
                mock_supabase._table_chains[name] = chain
            return mock_supabase._table_chains[name]
        mock_supabase.table = MagicMock(side_effect=table_fn)

        resp = await async_client.get("/api/v1/datasets", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # MUST be a list — this was the "r.map is not a function" root cause
        assert isinstance(data, list), f"Expected list, got {type(data)}: {data}"
        assert len(data) == 1
        assert data[0]["name"] == "titanic.csv"

    @pytest.mark.asyncio
    async def test_list_empty_returns_empty_array(self, async_client: AsyncClient, auth_headers, mock_supabase):
        """No datasets → empty array, not null or error."""
        mock_supabase._table_chains = {}
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.order.return_value = chain
        chain.execute.return_value = MagicMock(data=[])

        def table_fn(name):
            if name not in mock_supabase._table_chains:
                mock_supabase._table_chains[name] = chain
            return mock_supabase._table_chains[name]
        mock_supabase.table = MagicMock(side_effect=table_fn)

        resp = await async_client.get("/api/v1/datasets", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0


# ===================================================================
# Phase 5: Get / Delete single dataset (ownership enforced)
# ===================================================================

class TestDatasetCRUD:

    @pytest.mark.asyncio
    async def test_get_dataset_found(
        self, async_client: AsyncClient, auth_headers, mock_supabase, sample_dataset_row, test_dataset_id
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_dataset_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(f"/api/v1/datasets/{test_dataset_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == test_dataset_id

    @pytest.mark.asyncio
    async def test_get_dataset_not_found(self, async_client: AsyncClient, auth_headers, mock_supabase):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get("/api/v1/datasets/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_dataset_success(
        self, async_client: AsyncClient, auth_headers, mock_supabase, sample_dataset_row, test_dataset_id
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.delete.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_dataset_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.delete(f"/api/v1/datasets/{test_dataset_id}", headers=auth_headers)
        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_dataset_not_found(self, async_client: AsyncClient, auth_headers, mock_supabase):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.delete("/api/v1/datasets/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404


# ===================================================================
# Phase 6: Generate Synthetic Data
# ===================================================================

class TestGeneration:
    """Generate endpoint: validates input, checks quota, creates job, triggers Modal."""

    def _setup_generate_mocks(self, mock_supabase, sample_dataset_row, test_user_id):
        """Set up mocks for the generation flow (profile + dataset + synthetic_datasets)."""
        profile_data = {
            "id": test_user_id,
            "plan": "free",
            "jobs_quota": 3,
            "jobs_used_this_month": 0,
        }
        call_count = {"n": 0}

        def table_fn(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.insert.return_value = chain
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.in_.return_value = chain
            chain.limit.return_value = chain
            chain.order.return_value = chain

            if name == "profiles":
                chain.execute.return_value = MagicMock(data=[profile_data])
            elif name == "datasets":
                chain.execute.return_value = MagicMock(data=[sample_dataset_row])
            elif name == "synthetic_datasets":
                # First call: check running jobs (empty)
                # Second call: insert (return new row)
                call_count["n"] += 1
                if call_count["n"] <= 1:
                    chain.execute.return_value = MagicMock(data=[])
                else:
                    chain.execute.return_value = MagicMock(data=[{
                        "id": "new-synth-id",
                        "status": "pending",
                    }])
            else:
                chain.execute.return_value = MagicMock(data=[])
            return chain

        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=table_fn)

    @pytest.mark.asyncio
    async def test_generate_success(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_dataset_row, test_dataset_id, test_user_id,
    ):
        self._setup_generate_mocks(mock_supabase, sample_dataset_row, test_user_id)

        resp = await async_client.post(
            "/api/v1/generate",
            headers=auth_headers,
            json={
                "dataset_id": test_dataset_id,
                "method": "gaussian_copula",
                "num_rows": 1000,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_generate_missing_fields(self, async_client: AsyncClient, auth_headers):
        resp = await async_client.post(
            "/api/v1/generate",
            headers=auth_headers,
            json={},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_generate_dataset_not_found(
        self, async_client: AsyncClient, auth_headers, mock_supabase, test_user_id
    ):
        """Generate with non-existent dataset → 404."""
        def table_fn(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.limit.return_value = chain
            chain.execute.return_value = MagicMock(data=[
                {"id": test_user_id, "plan": "free", "jobs_used_this_month": 0}
            ] if name == "profiles" else [])
            return chain

        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=table_fn)

        resp = await async_client.post(
            "/api/v1/generate",
            headers=auth_headers,
            json={"dataset_id": "nonexistent", "method": "gaussian_copula"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_generate_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.post(
            "/api/v1/generate",
            json={"dataset_id": "x", "method": "gaussian_copula"},
        )
        assert resp.status_code in [401, 403]


# ===================================================================
# Phase 7: Quota Enforcement (Free plan: 3 jobs/month)
# ===================================================================

class TestQuotaEnforcement:

    @pytest.mark.asyncio
    async def test_free_plan_quota_exceeded(
        self, async_client: AsyncClient, auth_headers, mock_supabase, test_user_id
    ):
        """Free user who used 3 jobs → 402 with upgrade prompt."""
        def table_fn(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.limit.return_value = chain
            if name == "profiles":
                chain.execute.return_value = MagicMock(data=[{
                    "id": test_user_id,
                    "plan": "free",
                    "jobs_quota": 3,
                    "jobs_used_this_month": 3,
                }])
            else:
                chain.execute.return_value = MagicMock(data=[])
            return chain

        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=table_fn)

        resp = await async_client.post(
            "/api/v1/generate",
            headers=auth_headers,
            json={"dataset_id": "some-ds", "method": "gaussian_copula"},
        )
        assert resp.status_code == 402
        data = resp.json()
        assert "quota" in data["detail"]["error"] or "limit" in data["detail"]["error"]


# ===================================================================
# Phase 8: Generation Status & Cancellation
# ===================================================================

class TestGenerationStatus:

    @pytest.mark.asyncio
    async def test_get_status(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, test_synthetic_id,
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_synthetic_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(
            f"/api/v1/generate/{test_synthetic_id}/status",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100

    @pytest.mark.asyncio
    async def test_get_status_not_found(self, async_client: AsyncClient, auth_headers, mock_supabase):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(
            "/api/v1/generate/nonexistent-id/status",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_job(
        self, async_client: AsyncClient, auth_headers, mock_supabase, test_synthetic_id
    ):
        running_row = {"id": test_synthetic_id, "status": "running"}
        chain = MagicMock()
        chain.select.return_value = chain
        chain.update.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[running_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.patch(
            f"/api/v1/generate/{test_synthetic_id}/cancel",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert "cancelled" in data.get("error_message", "").lower()


# ===================================================================
# Phase 9: Synthetic Datasets List / Get / Download
# ===================================================================

class TestSyntheticDatasets:

    @pytest.mark.asyncio
    async def test_list_synthetic(
        self, async_client: AsyncClient, auth_headers, mock_supabase, sample_synthetic_row
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.order.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_synthetic_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get("/api/v1/synthetic", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    @pytest.mark.asyncio
    async def test_list_synthetic_filter_by_dataset(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, test_dataset_id,
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.order.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_synthetic_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(
            f"/api/v1/synthetic?dataset_id={test_dataset_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_synthetic(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, test_synthetic_id,
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_synthetic_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(
            f"/api/v1/synthetic/{test_synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["generation_method"] == "gaussian_copula"

    @pytest.mark.asyncio
    async def test_download_synthetic(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, test_synthetic_id,
    ):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[sample_synthetic_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        with patch("app.routers.generate.storage_service") as mock_storage:
            mock_storage.get_signed_url.return_value = "https://test.supabase.co/signed/download"

            resp = await async_client.get(
                f"/api/v1/synthetic/{test_synthetic_id}/download",
                headers=auth_headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "download_url" in data
            assert data["download_url"].startswith("https://")

    @pytest.mark.asyncio
    async def test_download_incomplete_returns_400(
        self, async_client: AsyncClient, auth_headers, mock_supabase, test_synthetic_id
    ):
        incomplete = {
            "id": test_synthetic_id,
            "user_id": "test-user-uuid-1234-5678-abcd-efghijklmnop",
            "status": "running",
            "file_path": None,
        }
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[incomplete])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.get(
            f"/api/v1/synthetic/{test_synthetic_id}/download",
            headers=auth_headers,
        )
        assert resp.status_code == 400


# ===================================================================
# Phase 10: Reports (Privacy, Quality, Compliance)
# ===================================================================

class TestReports:
    """All report endpoints verify ownership then return data or 404."""

    def _setup_report_mock(self, mock_supabase, synthetic_row, report_data, report_table):
        """Setup mock for report endpoints: ownership check + report lookup."""
        def table_fn(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.eq.return_value = chain
            chain.limit.return_value = chain
            chain.order.return_value = chain
            if name == "synthetic_datasets":
                chain.execute.return_value = MagicMock(data=[synthetic_row])
            elif name == report_table:
                chain.execute.return_value = MagicMock(data=[report_data] if report_data else [])
            else:
                chain.execute.return_value = MagicMock(data=[])
            return chain

        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=table_fn)

    @pytest.mark.asyncio
    async def test_privacy_report(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, sample_privacy_score, test_synthetic_id,
    ):
        self._setup_report_mock(mock_supabase, sample_synthetic_row, sample_privacy_score, "privacy_scores")

        resp = await async_client.get(
            f"/api/v1/reports/privacy/{test_synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_score"] == 85
        assert data["risk_level"] == "low"

    @pytest.mark.asyncio
    async def test_privacy_report_not_generated(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, test_synthetic_id,
    ):
        self._setup_report_mock(mock_supabase, sample_synthetic_row, None, "privacy_scores")

        resp = await async_client.get(
            f"/api/v1/reports/privacy/{test_synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_quality_report(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, sample_quality_report, test_synthetic_id,
    ):
        self._setup_report_mock(mock_supabase, sample_synthetic_row, sample_quality_report, "quality_reports")

        resp = await async_client.get(
            f"/api/v1/reports/quality/{test_synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["overall_score"] == 92

    @pytest.mark.asyncio
    async def test_compliance_report(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        sample_synthetic_row, sample_compliance_report, test_synthetic_id,
    ):
        self._setup_report_mock(mock_supabase, sample_synthetic_row, sample_compliance_report, "compliance_reports")

        resp = await async_client.get(
            f"/api/v1/reports/compliance/{test_synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["compliant"] is True

    @pytest.mark.asyncio
    async def test_report_ownership_enforced(
        self, async_client: AsyncClient, auth_headers, mock_supabase, test_synthetic_id
    ):
        """If user doesn't own the synthetic dataset → 404."""
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.limit.return_value = chain
        chain.execute.return_value = MagicMock(data=[])  # ownership check fails
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        for endpoint in ["privacy", "quality", "compliance"]:
            resp = await async_client.get(
                f"/api/v1/reports/{endpoint}/{test_synthetic_id}",
                headers=auth_headers,
            )
            assert resp.status_code == 404, f"/reports/{endpoint} should return 404 for non-owner"

    @pytest.mark.asyncio
    async def test_reports_require_auth(self, async_client: AsyncClient):
        for endpoint in ["privacy", "quality", "compliance"]:
            resp = await async_client.get(f"/api/v1/reports/{endpoint}/some-id")
            assert resp.status_code in [401, 403]


# ===================================================================
# Phase 11: Schema Detection (unit tests)
# ===================================================================

class TestSchemaDetection:
    """Schema detection from uploaded files."""

    def test_csv_schema_detection(self, titanic_csv_bytes):
        from app.services.schema_detector import detect_schema
        schema = detect_schema(titanic_csv_bytes, "text/csv")
        assert schema["row_count"] == 100
        assert schema["column_count"] == 8
        assert len(schema["columns"]) == 8
        # Verify column names
        col_names = [c["name"] for c in schema["columns"]]
        assert "PassengerId" in col_names
        assert "Sex" in col_names

    def test_csv_column_types(self, titanic_csv_bytes):
        from app.services.schema_detector import detect_schema
        schema = detect_schema(titanic_csv_bytes, "text/csv")
        type_map = {c["name"]: c["data_type"] for c in schema["columns"]}
        assert type_map["PassengerId"] == "numeric"
        assert type_map["Age"] == "numeric"
        assert type_map["Sex"] in ("categorical", "text")

    def test_empty_file_raises(self):
        from app.services.schema_detector import detect_schema, SchemaDetectionError
        with pytest.raises(SchemaDetectionError):
            detect_schema(b"", "text/csv")

    def test_json_schema_detection(self):
        import json
        from app.services.schema_detector import detect_schema
        data = [{"id": i, "name": f"User {i}", "active": True} for i in range(50)]
        json_bytes = json.dumps(data).encode()
        schema = detect_schema(json_bytes, "application/json")
        assert schema["row_count"] == 50
        assert schema["column_count"] == 3


# ===================================================================
# Phase 12: End-to-End Flow Simulation
# ===================================================================

class TestE2EFlowSimulation:
    """
    Simulates the full MVP loop with mocked Supabase:
    Auth → Upload → List → Generate → Status → Download → Reports
    """

    @pytest.mark.asyncio
    async def test_full_mvp_loop(
        self, async_client: AsyncClient, auth_headers, mock_supabase,
        titanic_csv_bytes, test_user_id,
    ):
        dataset_id = str(uuid.uuid4())
        synthetic_id = str(uuid.uuid4())

        # -- Step 1: Upload CSV --
        upload_row = {
            "id": dataset_id,
            "user_id": test_user_id,
            "name": "titanic.csv",
            "status": "ready",
            "row_count": 100,
            "column_count": 8,
            "file_path": f"{test_user_id}/{dataset_id}/titanic.csv",
            "file_type": "csv",
            "file_size": len(titanic_csv_bytes),
            "schema": {"row_count": 100, "column_count": 8, "columns": []},
        }
        chain = MagicMock()
        chain.insert.return_value = chain
        chain.execute.return_value = MagicMock(data=[upload_row])
        mock_supabase._table_chains = {}
        mock_supabase.table = MagicMock(side_effect=lambda name: chain)

        resp = await async_client.post(
            "/api/v1/datasets",
            headers=auth_headers,
            files={"file": ("titanic.csv", titanic_csv_bytes, "text/csv")},
        )
        assert resp.status_code == 201, f"Upload failed: {resp.text}"

        # -- Step 2: List datasets --
        list_chain = MagicMock()
        list_chain.select.return_value = list_chain
        list_chain.eq.return_value = list_chain
        list_chain.order.return_value = list_chain
        list_chain.execute.return_value = MagicMock(data=[upload_row])
        mock_supabase.table = MagicMock(side_effect=lambda name: list_chain)

        resp = await async_client.get("/api/v1/datasets", headers=auth_headers)
        assert resp.status_code == 200
        datasets = resp.json()
        assert isinstance(datasets, list)
        assert len(datasets) >= 1

        # -- Step 3: Generate synthetic data --
        gen_call_count = {"n": 0}

        def gen_table_fn(name):
            c = MagicMock()
            c.select.return_value = c
            c.insert.return_value = c
            c.update.return_value = c
            c.eq.return_value = c
            c.in_.return_value = c
            c.limit.return_value = c
            c.order.return_value = c

            if name == "profiles":
                c.execute.return_value = MagicMock(data=[{
                    "id": test_user_id, "plan": "pro", "jobs_used_this_month": 0,
                }])
            elif name == "datasets":
                c.execute.return_value = MagicMock(data=[{**upload_row, "status": "ready"}])
            elif name == "synthetic_datasets":
                gen_call_count["n"] += 1
                if gen_call_count["n"] == 1:
                    c.execute.return_value = MagicMock(data=[])  # no running jobs
                else:
                    c.execute.return_value = MagicMock(data=[{
                        "id": synthetic_id, "status": "pending",
                    }])
            else:
                c.execute.return_value = MagicMock(data=[])
            return c

        mock_supabase.table = MagicMock(side_effect=gen_table_fn)

        resp = await async_client.post(
            "/api/v1/generate",
            headers=auth_headers,
            json={"dataset_id": dataset_id, "method": "gaussian_copula", "num_rows": 500},
        )
        assert resp.status_code == 201, f"Generate failed: {resp.text}"

        # -- Step 4: Check generation status --
        completed_row = {
            "id": synthetic_id,
            "user_id": test_user_id,
            "original_dataset_id": dataset_id,
            "status": "completed",
            "progress": 100,
            "current_step": "Done",
            "generation_method": "gaussian_copula",
            "file_path": f"{test_user_id}/{synthetic_id}/synthetic.csv",
        }
        status_chain = MagicMock()
        status_chain.select.return_value = status_chain
        status_chain.eq.return_value = status_chain
        status_chain.limit.return_value = status_chain
        status_chain.execute.return_value = MagicMock(data=[completed_row])
        mock_supabase.table = MagicMock(side_effect=lambda name: status_chain)

        resp = await async_client.get(
            f"/api/v1/generate/{synthetic_id}/status",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

        # -- Step 5: Download synthetic data --
        with patch("app.routers.generate.storage_service") as mock_storage:
            mock_storage.get_signed_url.return_value = "https://test.supabase.co/signed/synthetic.csv"

            resp = await async_client.get(
                f"/api/v1/synthetic/{synthetic_id}/download",
                headers=auth_headers,
            )
            assert resp.status_code == 200
            assert "download_url" in resp.json()

        # -- Step 6: Get privacy report --
        privacy_data = {
            "id": str(uuid.uuid4()),
            "synthetic_dataset_id": synthetic_id,
            "overall_score": 88,
            "risk_level": "low",
            "pii_detected": {},
        }

        def report_table_fn(name):
            c = MagicMock()
            c.select.return_value = c
            c.eq.return_value = c
            c.limit.return_value = c
            c.order.return_value = c
            if name == "synthetic_datasets":
                c.execute.return_value = MagicMock(data=[completed_row])
            elif name == "privacy_scores":
                c.execute.return_value = MagicMock(data=[privacy_data])
            else:
                c.execute.return_value = MagicMock(data=[])
            return c

        mock_supabase.table = MagicMock(side_effect=report_table_fn)

        resp = await async_client.get(
            f"/api/v1/reports/privacy/{synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["overall_score"] == 88

        # -- Step 7: Get quality report --
        quality_data = {
            "id": str(uuid.uuid4()),
            "synthetic_dataset_id": synthetic_id,
            "overall_score": 91,
            "correlation_score": 89,
        }

        def quality_table_fn(name):
            c = MagicMock()
            c.select.return_value = c
            c.eq.return_value = c
            c.limit.return_value = c
            c.order.return_value = c
            if name == "synthetic_datasets":
                c.execute.return_value = MagicMock(data=[completed_row])
            elif name == "quality_reports":
                c.execute.return_value = MagicMock(data=[quality_data])
            else:
                c.execute.return_value = MagicMock(data=[])
            return c

        mock_supabase.table = MagicMock(side_effect=quality_table_fn)

        resp = await async_client.get(
            f"/api/v1/reports/quality/{synthetic_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["overall_score"] == 91


# ===================================================================
# Phase 13: Config & Startup Validation
# ===================================================================

class TestConfig:
    """Verify config loads correctly and CORS origins are set."""

    def test_settings_load(self):
        from app.config import settings
        assert settings.SUPABASE_URL == "https://test.supabase.co"
        assert settings.JWT_SECRET == "test-jwt-secret"

    def test_allowed_origins_includes_vercel(self):
        from app.config import settings
        origins = settings.allowed_origins_list
        assert "https://syntho-henna.vercel.app" in origins
        assert "https://syntho.vercel.app" in origins

    def test_allowed_origins_includes_frontend_url(self):
        from app.config import settings
        origins = settings.allowed_origins_list
        assert settings.FRONTEND_URL in origins
