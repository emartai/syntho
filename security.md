# Syntho — Security Guidelines
## Security Context File (Paste alongside context.md at the top of every prompt session)

---

## 🔐 Authentication & Authorization

### Supabase JWT Verification
- Every FastAPI route (except `/health` and `/api/webhooks/*`) MUST verify the Supabase JWT
- Use the `get_current_user` dependency injected into every protected route
- Never trust user_id from the request body — always extract it from the verified JWT
- JWT secret lives ONLY in backend `.env` — never in frontend code

```python
# backend/app/middleware/auth.py
# ALWAYS use this pattern — never skip auth on protected routes
async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                             audience="authenticated")
        return payload["sub"]  # user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Row Level Security (RLS)
- RLS MUST be enabled on ALL Supabase tables — no exceptions
- Backend uses service role key (bypasses RLS) — so backend code must manually enforce ownership checks
- Frontend NEVER uses service role key — only anon key (RLS is the guard)
- Always verify resource ownership before returning data:

```python
# CORRECT — always filter by user_id
dataset = supabase.table("datasets").select("*").eq("id", dataset_id).eq("user_id", user_id).single()

# WRONG — never fetch by id alone
dataset = supabase.table("datasets").select("*").eq("id", dataset_id).single()
```

### API Key Authentication
- API keys are stored as SHA-256 hashes — never store raw keys in the database
- The raw key is shown to the user ONCE on creation — never retrievable again
- Always use `secrets.compare_digest()` for hash comparison (timing-safe)
- API keys must be checked for: is_active=True, not expired, correct scope for the operation

```python
import hashlib, secrets

def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()

def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return secrets.compare_digest(hash_api_key(raw_key), stored_hash)
```

### Admin Routes
- Admin routes MUST check `profile.role == 'admin'` after JWT verification
- Admin role is set in the database — never trust a role claim from the frontend
- Log all admin actions to an audit table with: admin_id, action, target_id, timestamp

---

## 🛡️ Input Validation & Sanitization

### File Upload Security
- Validate file type by MIME type AND magic bytes — never trust the file extension alone
- Reject files that do not match expected types (CSV, JSON, Parquet, XLSX)
- Max file size enforced at both frontend (client-side) and backend (server-side): Free=50MB, Pro/Growth=500MB
- Scan file names: strip path separators, reject null bytes, normalize unicode
- Store files with a UUID-based path — never use the original filename as the storage path

```python
import magic  # python-magic library

ALLOWED_MIME_TYPES = {
    "text/csv", "application/json",
    "application/vnd.apache.parquet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

def validate_file(file_bytes: bytes, claimed_type: str):
    detected = magic.from_buffer(file_bytes[:2048], mime=True)
    if detected not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Invalid file type")
```

### API Request Validation
- All request bodies validated with Pydantic models — no raw dict access
- String fields: strip whitespace, enforce max lengths
- Numeric fields: enforce min/max ranges (e.g., epochs: 100–500, num_rows: 1–1,000,000)
- UUIDs: validate format before any DB query
- Reject unexpected fields: use `model_config = ConfigDict(extra='forbid')` in Pydantic models

### SQL Injection Prevention
- NEVER use raw SQL string formatting — always use Supabase's parameterized query builder
- If raw SQL is needed (migrations only), use parameterized queries exclusively

```python
# CORRECT
supabase.table("datasets").select("*").eq("user_id", user_id)

# WRONG — never do this
supabase.rpc(f"SELECT * FROM datasets WHERE user_id = '{user_id}'")
```

---

## 🔑 Secrets Management

### Environment Variable Rules
- No secrets in source code — ever. Not even in comments or test files
- No secrets in git history — add `.env`, `.env.local`, `.env.*` to `.gitignore` immediately
- No secrets in frontend bundle — `NEXT_PUBLIC_*` vars are visible to everyone
- Rotate any key that is accidentally committed to git immediately

### What Goes Where
| Secret | Frontend | Backend | Modal |
|--------|----------|---------|-------|
| Supabase URL | ✅ NEXT_PUBLIC | ✅ | ✅ |
| Supabase Anon Key | ✅ NEXT_PUBLIC | ❌ | ❌ |
| Supabase Service Key | ❌ NEVER | ✅ | ✅ |
| Supabase JWT Secret | ❌ NEVER | ✅ | ❌ |
| Flutterwave Public Key | ✅ NEXT_PUBLIC | ❌ | ❌ |
| Flutterwave Secret Key | ❌ NEVER | ✅ | ❌ |
| Modal API Secret | ❌ NEVER | ✅ | ✅ |

### Secret Rotation Plan
- Rotate Supabase JWT secret: update in backend `.env` + redeploy Render
- Rotate Flutterwave keys: update in Render env vars + redeploy
- Rotate Modal API secret: update in both Render env AND Modal secret store (syntho-secrets)
- API keys (user-facing sk_live_*): users can revoke and regenerate at any time from /api-keys page

---

## 🚦 Rate Limiting

### Endpoints and Their Limits
| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/v1/datasets (upload) | 20 req | per hour per user |
| POST /api/v1/generate | 10 req | per hour per user |
| POST /api/v1/billing/upgrade | 10 req | per hour per user |
| All external API (sk_live_* keys) | 60 req | per minute per key |
| All external API (sk_live_* keys) | 1000 req | per day per key |
| POST /auth/* (login attempts) | 10 req | per 15 min per IP |

### Implementation
- Use in-memory sliding window counter (no Redis dependency for Launch)
- Return standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Return 429 with JSON body: `{"error": "Rate limit exceeded", "retry_after": seconds}`
- Log repeated rate limit violations — could indicate abuse or attack

---

## 🌐 CORS & Headers

### CORS Configuration (FastAPI)
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "https://your-syntho-app.vercel.app",  # production only
    "http://localhost:3000",               # local dev only
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,         # NEVER use ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-API-Secret"],
)
```

### Security Headers (Next.js — vercel.json)
Always set these headers on all frontend responses:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ]
}
```

---

## 💳 Payment Security

### Flutterwave Webhook Verification
- ALWAYS verify the webhook hash before processing any payment event
- Never grant access based solely on a frontend payment success callback
- The backend must independently verify every transaction with Flutterwave's API

```python
import hmac, hashlib

def verify_flutterwave_webhook(payload_str: str, signature: str, secret_hash: str) -> bool:
    expected = hmac.new(
        secret_hash.encode(), payload_str.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# In webhook route:
signature = request.headers.get("verif-hash")
if not verify_flutterwave_webhook(body_str, signature, FLUTTERWAVE_WEBHOOK_HASH):
    raise HTTPException(400, "Invalid webhook signature")
```

### Purchase Verification Flow
1. Frontend sends tx_ref to backend after Flutterwave inline checkout success
2. Backend calls Flutterwave `/v3/transactions/verify_by_reference` — never trust frontend
3. Verify: amount matches listing price, currency matches, status is "successful"
4. Only then create purchase record and grant download access
5. Webhook provides a second confirmation — use it for logging/reconciliation
6. Make purchase creation idempotent: use `ON CONFLICT (flutterwave_tx_ref) DO NOTHING`

### Download Access Control
- Signed Supabase Storage URLs expire in 1 hour — never return permanent URLs
- Before generating a signed URL, always verify the user has a completed purchase record
- Re-generate URL on each request — do not cache signed URLs

---

## 📁 File Storage Security

### Supabase Storage Policies
```sql
-- Users can only upload to their own folder
CREATE POLICY "users_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can only read their own files
CREATE POLICY "users_read_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('datasets', 'synthetic', 'reports')
         AND (storage.foldername(name))[1] = auth.uid()::text);

-- Marketplace buyers can read purchased synthetic files
-- (handled via backend signed URL generation after purchase check — not direct storage access)
```

### File Path Structure
Always use this path format to enforce ownership via storage policies:
```
datasets/{user_id}/{dataset_id}/{uuid}.csv        ✅
synthetic/{user_id}/{synthetic_id}/data.csv       ✅
reports/{user_id}/{synthetic_id}/compliance.pdf   ✅

datasets/myfile.csv                               ❌ Never flat paths
```

---

## 🤖 Modal ML Security

### Endpoint Authentication
- Modal web endpoint MUST validate `X-API-Secret` header on every request
- Use `secrets.compare_digest()` for timing-safe comparison
- Reject all requests without valid secret with 401

```python
# modal_ml/main.py
import os, secrets

@app.function(...)
@modal.web_endpoint(method="POST")
async def run_job(request: Request):
    api_secret = request.headers.get("X-API-Secret", "")
    if not secrets.compare_digest(api_secret, os.environ["MODAL_API_SECRET"]):
        return {"error": "Unauthorized"}, 401
```

### Input Validation in Modal
- Validate all payload fields before processing (synthetic_dataset_id is valid UUID, method is in allowed list, config values are within safe ranges)
- Max dataset size for ML processing: 500MB — reject larger files
- CTGAN epochs: cap at 500 — prevent runaway GPU jobs
- Always wrap ML job in try/except — update DB to 'failed' status on any exception, never leave jobs hanging in 'running'

---

## 🔍 Data Privacy & Compliance

### Handling Real User Data
- Original uploaded datasets may contain real PII — treat them as sensitive
- Never log dataset contents — only log metadata (file size, row count, column names)
- Original files are deleted from Supabase Storage when the user deletes the dataset
- Synthetic files are what get shared/sold — never the originals

### GDPR Compliance for Syntho Itself
- Users can request deletion of their account + all data (DELETE /api/v1/account endpoint)
- Deleting a user cascades to: datasets, synthetic_datasets, api_keys, notifications (all via ON DELETE CASCADE in schema)
- Store only the minimum data needed — do not collect unnecessary user info
- Original uploaded datasets are deleted from storage when user deletes the dataset record

---

## 🚨 Error Handling & Logging

### What to Log (Safe)
- Request method, path, status code, response time
- User ID (not email), dataset ID, job ID
- Error types and stack traces (server-side only)
- Rate limit violations with IP
- Failed authentication attempts with IP

### What to Never Log
- JWT tokens or API keys (even partial — except the display prefix)
- File contents or dataset data
- User emails or personal info in application logs
- Flutterwave secret keys or webhook payloads with card data
- Supabase service role key

### Error Response Format
Never expose internal error details to the client:
```python
# CORRECT — safe error response
raise HTTPException(status_code=500, detail="Internal server error")

# WRONG — leaks implementation details
raise HTTPException(status_code=500, detail=str(e))  # exposes stack trace
```

---

## 🔒 Dependency Security

### Keep Dependencies Updated
- Run `pip audit` monthly on backend dependencies
- Run `npm audit` monthly on frontend dependencies
- Pin dependency versions in requirements.txt and package.json (already done in context.md)
- Never install packages with `--ignore-security` flags

### Trusted Packages Only
All ML libraries used (SDV, CTGAN, Presidio, scikit-learn) are from verified, maintained sources.
Before adding any new dependency:
- Check it has recent commits and active maintenance
- Check PyPI/npm download counts
- Review open security advisories

---

## ✅ Security Checklist (Complete Before Launch)

### Backend
- [ ] All routes require authentication (except /health, /api/webhooks/*)
- [ ] RLS enabled on all Supabase tables
- [ ] File upload validates MIME type + magic bytes (python-magic)
- [ ] Rate limiting active on all /api/v1/ routes
- [ ] CORS locked to production Vercel URL only
- [ ] Flutterwave webhook signature verified on every event
- [ ] Modal endpoint validates X-API-Secret header
- [ ] No secrets in source code or git history (`git log --all -p | grep -i "secret\|key\|password"`)
- [ ] Error responses never expose stack traces or raw exception messages
- [ ] Free tier row cap (10k) enforced server-side before job starts
- [ ] CTGAN locked to Pro/Growth plans server-side

### Frontend
- [ ] No service role key or secret keys in any frontend code
- [ ] No NEXT_PUBLIC_ variables contain secrets
- [ ] Security headers set in vercel.json (CSP, HSTS, X-Frame-Options, nosniff)
- [ ] Signed URLs used for all file downloads (never permanent URLs)
- [ ] Auth token sent in Authorization header only

### Database
- [ ] RLS policies tested: user A cannot access user B's data
- [ ] trust_scores RLS verified (users only see their own)
- [ ] Admin role verified server-side (not from frontend claim)
- [ ] Cascade deletes work correctly (test account deletion)
- [ ] Storage bucket policies block cross-user access

### Payments (Subscription via Flutterwave)
- [ ] Upgrade verification calls Flutterwave API — not just frontend callback
- [ ] Webhook signature verified before processing any plan upgrade
- [ ] Plan change only happens after server-side payment verification

### API Keys
- [ ] API keys stored as SHA-256 hash only — never raw
- [ ] Full key shown to user exactly once on creation — not stored in plain text
- [ ] Free plan cannot create API keys (enforced server-side)
- [ ] Key scope checked on every API key-authenticated request
