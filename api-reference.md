# Syntho — Public API Reference
## For teams integrating Syntho into ML pipelines via sk_live_ keys

---

## Authentication

All API requests require an API key in the Authorization header:
```
Authorization: Bearer sk_live_your_api_key_here
```

API keys are created in the Syntho dashboard under **API Keys** (Pro/Growth plans only). Keys have scopes:
- `read` — list datasets, fetch status, download results
- `generate` — trigger synthetic data generation

---

## Base URL
```
https://your-render-app.onrender.com/api/v1/ext
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-03-09T10:00:00Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "DATASET_NOT_FOUND",
    "message": "Dataset with id xxx was not found",
    "details": {}
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-03-09T10:00:00Z"
  }
}
```

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 60 |
| Requests per day | 1,000 |
| Max file size | 50MB (Free) / 500MB (Pro/Growth) |
| Free plan: max rows per job | 10,000 |
| Free plan: max jobs per month | 10 |
| Free plan: methods | gaussian_copula only |

Rate limit headers returned on every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1741521600
```

When exceeded: HTTP 429 with `retry_after` field in seconds.

---

## Endpoints

### Datasets

#### Upload Dataset
```
POST /api/v1/ext/datasets
Content-Type: multipart/form-data
Scope: generate
```

Form fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | CSV, JSON, Parquet, or XLSX. Free: 50MB max. Pro/Growth: 500MB max |
| name | string | Yes | Display name for the dataset |
| description | string | No | Optional description |

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "patient_records",
    "file_type": "csv",
    "row_count": 50000,
    "column_count": 14,
    "schema": [
      { "name": "age", "data_type": "numeric", "null_percentage": 0.02 },
      { "name": "diagnosis", "data_type": "categorical", "null_percentage": 0.0 }
    ],
    "status": "ready",
    "created_at": "2026-03-09T10:00:00Z"
  }
}
```

Error codes: `FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `CORRUPTED_FILE`

---

#### List Datasets
```
GET /api/v1/ext/datasets
Scope: read
```

Query params:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 20 | Max 100 |
| offset | int | 0 | Pagination offset |
| status | string | all | Filter: uploaded, ready, error |

Response:
```json
{
  "success": true,
  "data": {
    "items": [ { ...dataset } ],
    "total": 12,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### Get Dataset
```
GET /api/v1/ext/datasets/{dataset_id}
Scope: read
```

Response: Single dataset object with full schema.

---

### Generation

#### Start Generation Job
```
POST /api/v1/ext/generate
Scope: generate
Content-Type: application/json
```

Body:
```json
{
  "dataset_id": "uuid",
  "method": "gaussian_copula",
  "config": {
    "num_rows": 50000,
    "epochs": 300,
    "batch_size": 500
  }
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| dataset_id | string | Yes | UUID of uploaded dataset |
| method | string | Yes | `gaussian_copula` (all plans) or `ctgan` (Pro/Growth only) |
| config.num_rows | int | No | Default: same as original. Free plan max: 10,000 |
| config.epochs | int | No (CTGAN only) | 100–500, default 300 |
| config.batch_size | int | No (CTGAN only) | Default 500 |

Response:
```json
{
  "success": true,
  "data": {
    "synthetic_dataset_id": "uuid",
    "job_id": "modal-job-id",
    "status": "pending",
    "estimated_minutes": 8,
    "method": "ctgan"
  }
}
```

Error codes: `DATASET_NOT_FOUND`, `INVALID_METHOD`, `QUOTA_EXCEEDED`, `JOB_LIMIT_REACHED`

---

#### Get Job Status
```
GET /api/v1/ext/generate/{synthetic_dataset_id}/status
Scope: read
```

Response:
```json
{
  "success": true,
  "data": {
    "synthetic_dataset_id": "uuid",
    "status": "running",
    "progress": 64,
    "current_step": "Training CTGAN model",
    "elapsed_seconds": 180,
    "estimated_seconds_remaining": 120,
    "created_at": "2026-03-09T10:00:00Z"
  }
}
```

Status values: `pending` | `running` | `completed` | `failed`

---

#### Cancel Job
```
DELETE /api/v1/ext/generate/{synthetic_dataset_id}
Scope: generate
```

Response: `{ "success": true, "data": { "cancelled": true } }`

---

### Results

#### Get All Reports
```
GET /api/v1/ext/results/{synthetic_dataset_id}
Scope: read
```

Returns all reports once status is `completed`:
```json
{
  "success": true,
  "data": {
    "synthetic_dataset_id": "uuid",
    "status": "completed",
    "trust_score": {
      "composite_score": 88.4,
      "privacy_score": 91.2,
      "fidelity_score": 89.6,
      "compliance_score": 80.0,
      "label": "Good"
    },
    "privacy_score": {
      "overall_score": 91.2,
      "risk_level": "low",
      "pii_detected": [],
      "details": { }
    },
    "quality_report": {
      "correlation_score": 91.4,
      "distribution_score": 88.7,
      "overall_score": 90.1,
      "passed": true
    },
    "compliance_report": {
      "report_type": "combined",
      "passed": true,
      "gdpr_passed": true,
      "hipaa_passed": true,
      "findings": [],
      "pdf_url": "https://signed-url... (expires 1hr)"
    },
    "row_count": 50000,
    "generation_method": "ctgan",
    "completed_at": "2026-03-09T10:12:00Z"
  }
}
```

Error codes: `JOB_NOT_COMPLETE`, `SYNTHETIC_DATASET_NOT_FOUND`

---

#### Download Synthetic Dataset
```
GET /api/v1/ext/results/{synthetic_dataset_id}/download
Scope: read
```

Response: HTTP 302 redirect to signed Supabase Storage URL (expires in 1 hour).

To get the URL without following the redirect:
```
GET /api/v1/ext/results/{synthetic_dataset_id}/download-url
```
Returns: `{ "url": "https://...", "expires_at": "2026-03-09T11:12:00Z" }`

---

#### Download Compliance PDF
```
GET /api/v1/ext/results/{synthetic_dataset_id}/compliance-pdf
Scope: read
```

Response: HTTP 302 redirect to signed PDF URL (expires 1 hour).

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | API key lacks required scope |
| `RATE_LIMITED` | 429 | Too many requests |
| `DATASET_NOT_FOUND` | 404 | Dataset ID not found or not owned by you |
| `SYNTHETIC_NOT_FOUND` | 404 | Synthetic dataset not found |
| `FILE_TOO_LARGE` | 400 | File exceeds plan size limit (50MB free, 500MB pro/growth) |
| `INVALID_FILE_TYPE` | 400 | File type not supported |
| `CORRUPTED_FILE` | 400 | File could not be parsed |
| `INVALID_METHOD` | 400 | method must be gaussian_copula or ctgan |
| `QUOTA_EXCEEDED` | 402 | Monthly job quota reached (free: 10/mo) or row cap exceeded (free: 10k rows) |
| `METHOD_NOT_ALLOWED` | 402 | CTGAN requires Pro or Growth plan |
| `JOB_NOT_COMPLETE` | 409 | Results not ready yet |
| `ML_UNAVAILABLE` | 503 | Modal ML service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Code Examples

### Python
```python
import requests
import time

API_KEY = "sk_live_your_key_here"
BASE_URL = "https://your-render-app.onrender.com/api/v1/ext"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# 1. Upload dataset
with open("patient_records.csv", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/datasets",
        headers=HEADERS,
        files={"file": f},
        data={"name": "Patient Records Q1 2026"}
    )
dataset_id = response.json()["data"]["id"]

# 2. Generate synthetic data
response = requests.post(
    f"{BASE_URL}/generate",
    headers=HEADERS,
    json={
        "dataset_id": dataset_id,
        "method": "gaussian_copula",
        "config": {"num_rows": 50000}
    }
)
synthetic_id = response.json()["data"]["synthetic_dataset_id"]

# 3. Poll for completion
while True:
    status = requests.get(f"{BASE_URL}/generate/{synthetic_id}/status", headers=HEADERS).json()
    print(f"Progress: {status['data']['progress']}%")
    if status["data"]["status"] in ("completed", "failed"):
        break
    time.sleep(10)

# 4. Get results and download
results = requests.get(f"{BASE_URL}/results/{synthetic_id}", headers=HEADERS).json()
print(f"Privacy Score: {results['data']['privacy_score']['overall_score']}")

download = requests.get(f"{BASE_URL}/results/{synthetic_id}/download-url", headers=HEADERS).json()
print(f"Download URL: {download['data']['url']}")
```

### JavaScript / Node.js
```javascript
const API_KEY = 'sk_live_your_key_here';
const BASE_URL = 'https://your-render-app.onrender.com/api/v1/ext';
const headers = { 'Authorization': `Bearer ${API_KEY}` };

// Upload
const form = new FormData();
form.append('file', fs.createReadStream('data.csv'));
form.append('name', 'My Dataset');

const upload = await fetch(`${BASE_URL}/datasets`, { method: 'POST', headers, body: form });
const { data: { id: datasetId } } = await upload.json();

// Generate
const gen = await fetch(`${BASE_URL}/generate`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ dataset_id: datasetId, method: 'ctgan', config: { num_rows: 10000, epochs: 200 } })
});
const { data: { synthetic_dataset_id } } = await gen.json();

// Poll
const poll = async () => {
  const res = await fetch(`${BASE_URL}/generate/${synthetic_dataset_id}/status`, { headers });
  const { data } = await res.json();
  if (data.status === 'completed') return data;
  if (data.status === 'failed') throw new Error('Generation failed');
  await new Promise(r => setTimeout(r, 10000));
  return poll();
};
const result = await poll();
console.log('Done:', result);
```

### cURL
```bash
# Upload
curl -X POST https://your-render-app.onrender.com/api/v1/ext/datasets \
  -H "Authorization: Bearer sk_live_your_key" \
  -F "file=@data.csv" \
  -F "name=My Dataset"

# Generate
curl -X POST https://your-render-app.onrender.com/api/v1/ext/generate \
  -H "Authorization: Bearer sk_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{"dataset_id":"uuid","method":"gaussian_copula","config":{"num_rows":10000}}'

# Check status
curl https://your-render-app.onrender.com/api/v1/ext/generate/{id}/status \
  -H "Authorization: Bearer sk_live_your_key"

# Get results
curl https://your-render-app.onrender.com/api/v1/ext/results/{id} \
  -H "Authorization: Bearer sk_live_your_key"
```
