"""Pytest configuration and fixtures for Syntho backend tests."""
import asyncio
import os
import sys
import time
import uuid
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set env vars BEFORE importing any app modules
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["MODAL_API_URL"] = "https://test.modal.run"
os.environ["MODAL_API_SECRET"] = "test-modal-secret"
os.environ["FRONTEND_URL"] = "https://syntho-henna.vercel.app"
os.environ["GROQ_API_KEY"] = "test-groq-key"
os.environ["FLUTTERWAVE_SECRET_KEY"] = "test-flw-secret"
os.environ["REDIS_URL"] = "redis://localhost:6379"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Mock Supabase client
# ---------------------------------------------------------------------------

def _make_chain_mock():
    """Create a chainable mock that supports .select().eq().limit().execute() etc."""
    chain = MagicMock()
    chain.select.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.delete.return_value = chain
    chain.eq.return_value = chain
    chain.in_.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.maybeSingle.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    return chain


@pytest.fixture
def mock_supabase():
    """Full mock Supabase client with chainable table and storage."""
    mock = MagicMock()
    mock._table_chains = {}

    original_table = mock.table

    def table_fn(name):
        if name not in mock._table_chains:
            mock._table_chains[name] = _make_chain_mock()
        return mock._table_chains[name]

    mock.table = MagicMock(side_effect=table_fn)

    # Storage mock
    storage_bucket = MagicMock()
    storage_bucket.upload.return_value = {"path": "test/path"}
    storage_bucket.create_signed_url.return_value = {"signedURL": "https://test.supabase.co/signed/url"}
    storage_bucket.remove.return_value = True
    mock.storage.from_.return_value = storage_bucket

    return mock


@pytest_asyncio.fixture
async def async_client(mock_supabase) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient that patches Supabase singleton so all get_supabase() calls return mock."""
    from app.services.supabase import SupabaseClient
    original = SupabaseClient._instance
    SupabaseClient._instance = mock_supabase
    try:
        from app.main import app
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        SupabaseClient._instance = original


# ---------------------------------------------------------------------------
# Auth fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_user_id():
    return "test-user-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def test_user_token(test_user_id):
    import jwt
    payload = {
        "sub": test_user_id,
        "email": "testuser@example.com",
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, "test-jwt-secret", algorithm="HS256")


@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_dataset_id():
    return "test-dataset-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def test_synthetic_id():
    return "test-synthetic-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def titanic_csv_content():
    header = "PassengerId,Survived,Pclass,Name,Sex,Age,Fare,Embarked"
    rows = [
        '1,0,3,"Braund Mr Owen Harris",male,22,7.25,S',
        '2,1,1,"Cumings Mrs John Bradley",female,38,71.28,C',
        '3,1,3,"Heikkinen Miss Laina",female,26,7.92,S',
        '4,1,1,"Futrelle Mrs Jacques Heath",female,35,53.1,S',
        '5,0,3,"Allen Mr William Henry",male,35,8.05,S',
        '6,0,3,"Moran Mr James",male,,8.46,Q',
        '7,0,1,"McCarthy Mr Timothy J",male,54,51.86,S',
        '8,0,3,"Palsson Master Gosta Leonard",male,2,21.08,S',
        '9,1,1,"Johnson Mrs Oscar W",female,27,30,S',
        '10,1,2,"Nasser Mrs Nicholas",female,14,13,S',
    ]
    return "\n".join([header] + rows * 10)


@pytest.fixture
def titanic_csv_bytes(titanic_csv_content):
    return titanic_csv_content.encode("utf-8")


@pytest.fixture
def sample_dataset_row(test_dataset_id, test_user_id):
    """A realistic dataset DB row as returned by Supabase."""
    return {
        "id": test_dataset_id,
        "user_id": test_user_id,
        "name": "titanic.csv",
        "file_path": f"{test_user_id}/{test_dataset_id}/titanic.csv",
        "file_size": 5000,
        "file_type": "csv",
        "row_count": 100,
        "column_count": 8,
        "schema": {
            "row_count": 100,
            "column_count": 8,
            "columns": [
                {"name": "PassengerId", "data_type": "numeric"},
                {"name": "Survived", "data_type": "numeric"},
                {"name": "Pclass", "data_type": "numeric"},
                {"name": "Name", "data_type": "text"},
                {"name": "Sex", "data_type": "categorical"},
                {"name": "Age", "data_type": "numeric"},
                {"name": "Fare", "data_type": "numeric"},
                {"name": "Embarked", "data_type": "categorical"},
            ],
        },
        "status": "ready",
        "created_at": "2025-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_synthetic_row(test_synthetic_id, test_dataset_id, test_user_id):
    """A realistic synthetic_datasets DB row."""
    return {
        "id": test_synthetic_id,
        "original_dataset_id": test_dataset_id,
        "user_id": test_user_id,
        "generation_method": "gaussian_copula",
        "status": "completed",
        "progress": 100,
        "current_step": "Done",
        "file_path": f"{test_user_id}/{test_synthetic_id}/synthetic.csv",
        "created_at": "2025-01-01T01:00:00Z",
    }


@pytest.fixture
def sample_privacy_score(test_synthetic_id):
    return {
        "id": str(uuid.uuid4()),
        "synthetic_dataset_id": test_synthetic_id,
        "overall_score": 85,
        "risk_level": "low",
        "pii_detected": {"email": 0, "phone": 0, "name": 2},
        "k_anonymity": 5,
        "l_diversity": 3,
        "created_at": "2025-01-01T01:05:00Z",
    }


@pytest.fixture
def sample_quality_report(test_synthetic_id):
    return {
        "id": str(uuid.uuid4()),
        "synthetic_dataset_id": test_synthetic_id,
        "overall_score": 92,
        "column_scores": {"PassengerId": 95, "Age": 88},
        "correlation_score": 90,
        "distribution_score": 93,
        "created_at": "2025-01-01T01:05:00Z",
    }


@pytest.fixture
def sample_compliance_report(test_synthetic_id):
    return {
        "id": str(uuid.uuid4()),
        "synthetic_dataset_id": test_synthetic_id,
        "report_type": "gdpr",
        "compliant": True,
        "findings": [],
        "file_path": f"reports/{test_synthetic_id}/compliance.pdf",
        "created_at": "2025-01-01T01:05:00Z",
    }
