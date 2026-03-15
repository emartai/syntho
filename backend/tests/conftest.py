"""Pytest configuration and fixtures for Syntho backend tests."""
import asyncio
import os
import sys
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret"
os.environ["FLUTTERWAVE_SECRET_KEY"] = "test-flw-secret"
os.environ["FLUTTERWAVE_WEBHOOK_HASH"] = "test-webhook-hash"
os.environ["MODAL_API_URL"] = "https://test.modal.run"
os.environ["MODAL_API_SECRET"] = "test-modal-secret"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["GROQ_API_KEY"] = "test-groq-key"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_supabase_client():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = []
    mock.table.return_value.update.return_value.execute.return_value.data = []
    mock.table.return_value.delete.return_value.execute.return_value.data = []
    mock.storage.from_.return_value.upload.return_value.data = {"path": "test/path"}
    mock.storage.from_.return_value.create_signed_url.return_value.data = {"signed_url": "https://test.url"}
    return mock


@pytest.fixture
def mock_groq_client():
    mock = AsyncMock()
    mock.chat.completions.create.return_value.choices = [
        MagicMock(message=MagicMock(content='{"method": "gaussian_copula"}'))
    ]
    return mock


@pytest.fixture
def mock_modal_stub():
    mock = MagicMock()
    mock.run_job = AsyncMock(return_value={"job_id": "test-job-123", "status": "started"})
    mock.get_status = AsyncMock(return_value={"status": "running", "progress": 50})
    mock.cancel_job = AsyncMock(return_value={"status": "cancelled"})
    return mock


@pytest.fixture
def test_user_id():
    return "test-user-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def test_user_token(test_user_id):
    import jwt
    payload = {"sub": test_user_id, "email": "test@example.com", "iat": 1700000000, "exp": 1702600000}
    return jwt.encode(payload, "test-jwt-secret", algorithm="HS256")


@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def test_dataset_id():
    return "test-dataset-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def test_synthetic_dataset_id():
    return "test-synthetic-uuid-1234-5678-abcd-efghijklmnop"


@pytest.fixture
def test_api_key():
    import hashlib
    key = "sk_test_abcdefghijklmnopqrstuvwxyz123456"
    return {"raw": key, "hash": hashlib.sha256(key.encode()).hexdigest(), "prefix": "sk_test_"}


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
def sample_json_content():
    import json
    data = [{"id": i, "name": f"User {i}", "email": f"user{i}@example.com", "active": True} for i in range(100)]
    return json.dumps(data).encode("utf-8")


@pytest.fixture
def mock_rate_limit_client():
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.incr.return_value = 1
    mock.expire.return_value = True
    mock.ttl.return_value = 60
    return mock