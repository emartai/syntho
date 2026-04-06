# Syntho — Launch MVP Build Prompts
## 20 Prompts → Launch-Ready Product

> **How to use:** Read `context.md` + `security.md` + `design.md` at the top of every Claude session, then paste the prompt for the module you are building.
> Each prompt is fully self-contained. Complete them in order — later prompts build on earlier ones.

---

## PROMPT 1 — Project Scaffold + Environment Setup

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

You are building Syntho — a Synthetic Data SaaS. Theme: "It works, it's trustworthy, developers love it."

Task: Scaffold the complete Next.js 14 frontend project with all configuration.

Create the following:
1. next.config.js — image domains, env setup, strict mode
2. tailwind.config.ts — shadcn/ui config + full Plasma Aurora design system (CSS variables, Clash Display + Satoshi + JetBrains Mono fonts, aurora keyframes)
3. tsconfig.json — strict TypeScript
4. app/globals.css — all CSS variables from design.md, font imports, base styles
5. app/layout.tsx — root layout: fonts, dark mode (class strategy), AuroraBackground, Sonner toaster, TanStack Query provider, AuthProvider
6. app/page.tsx — landing page importing components from app/_components/:
   - Navbar (logo + "Sign In" + "Get Started" CTA)
   - Hero: headline "Generate Safe Synthetic Data. Stay Compliant.", subline, two CTAs ("Start Free" → /login, "See How It Works" → #how-it-works)
   - SocialProofBar: logos/names of Nigerian fintechs (Flutterwave, Paystack, Kuda, Moniepoint) as "Trusted by teams at"
   - HowItWorks: 5-step flow (Upload → Detect Schema → Generate → Score → Download PDF)
   - Features: 6 feature cards (Upload any format, CTGAN + Gaussian Copula, Composite Trust Score, PII Detection, GDPR/HIPAA PDF, API Access)
   - Pricing: 3 tiers — Free (₦0/10 jobs/10k rows/Gaussian Copula), Pro (₦5,000/mo/unlimited/CTGAN+API), Growth (₦15,000/mo/priority queue+PDF branding)
   - FAQ: 5 common questions
   - FinalCTA: "Start generating in 5 minutes" with email input → /login
   - Footer
7. components/ui/ — install: button, card, badge, input, label, dialog, tabs, progress, skeleton, select, textarea, checkbox, toast via shadcn/ui
8. lib/utils.ts — cn() utility
9. types/index.ts — TypeScript interfaces: Dataset, SyntheticDataset, PrivacyScore, ComplianceReport, QualityReport, TrustScore, ApiKey, Notification, Profile, JobStatus, Plan
10. package.json — all dependencies from context.md
11. .env.local.example — all env vars from context.md (no real values, with comments)
12. vercel.json — security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options

Landing page must be visually impressive: dark bg (#05030f), aurora blobs, gradient hero text, Plasma Aurora palette from design.md.
```

---

## PROMPT 2 — Supabase Schema + Auth

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Set up Supabase auth and the complete database schema.

Create the following:
1. supabase/migrations/001_initial_schema.sql — complete schema:
   - profiles (id, email, full_name, avatar_url, role, plan, jobs_used_this_month, quota_reset_at, created_at)
     plan CHECK IN ('free','pro','growth')
   - datasets (id, user_id, name, description, file_path, file_size, file_type, row_count, column_count, schema JSONB, status)
   - synthetic_datasets (id, original_dataset_id, user_id, generation_method, file_path, row_count, status, progress, error_message, config JSONB, created_at)
     generation_method CHECK IN ('ctgan','gaussian_copula')
   - privacy_scores (id, synthetic_dataset_id, overall_score, pii_detected JSONB, risk_level, details JSONB)
   - quality_reports (id, synthetic_dataset_id, correlation_score, distribution_score, overall_score, column_stats JSONB, passed)
   - compliance_reports (id, synthetic_dataset_id, report_type, file_path, passed, gdpr_passed, hipaa_passed, findings JSONB)
   - trust_scores (id, synthetic_dataset_id, composite_score NUMERIC(5,2), privacy_weight NUMERIC(5,2), fidelity_weight NUMERIC(5,2), compliance_weight NUMERIC(5,2), label TEXT, created_at)
     — composite_score = (privacy_score × 0.40) + (fidelity_score × 0.40) + (compliance_score × 0.20), clamped 0–100
   - api_keys (id, user_id, name, key_hash, key_prefix, scopes TEXT[], usage_count, last_used_at, expires_at, is_active)
   - notifications (id, user_id, type, title, message, link, read, created_at)
   - job_logs (id, synthetic_dataset_id, event, message, created_at)

2. supabase/migrations/002_rls_policies.sql — RLS on every table:
   - Users read/write only their own rows (filter by user_id = auth.uid())
   - Admin role bypasses all policies

3. supabase/migrations/003_storage_policies.sql — 3 private buckets:
   - datasets, synthetic, reports
   - Users can upload/download only to their own path: {bucket}/{user_id}/...

4. supabase/migrations/004_freemium_quota.sql:
   - Add pg_cron job to reset jobs_used_this_month to 0 on 1st of each month
   - Add trigger: on INSERT to synthetic_datasets WHERE status='pending', increment profiles.jobs_used_this_month

5. supabase/migrations/005_indexes.sql — indexes on all FK columns + status + created_at

6. lib/supabase/client.ts — browser client (createBrowserClient from @supabase/ssr)
7. lib/supabase/server.ts — server client (createServerClient, reads cookies)
8. middleware.ts — refresh sessions, protect all /(dashboard) routes, redirect /login if no session
9. app/(auth)/login/page.tsx — centered card, Syntho logo, "Sign in with Google", "Sign in with GitHub", redirect to /dashboard after auth
10. app/(auth)/signup/page.tsx — same as login (Supabase OAuth handles both flows)
11. hooks/useAuth.ts — returns { user, profile, signOut, isLoading }
12. Supabase trigger SQL: auto-create profiles row on new auth.users signup (set plan='free', jobs_used_this_month=0)
```

---

## PROMPT 3 — Layout + Dashboard Shell

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the protected dashboard layout with sidebar, navbar, and overview dashboard.

Create the following:
1. app/(dashboard)/layout.tsx — checks auth (redirect to /login), renders Sidebar + Navbar, wraps in QueryClientProvider + AuthProvider

2. components/layout/Sidebar.tsx:
   - Syntho logo at top
   - Nav items with lucide-react icons:
     • Dashboard → /dashboard
     • My Datasets → /datasets
     • Upload → /upload
     • API Keys → /api-keys (shown always — this is a Launch feature)
     • Billing → /settings/billing
   - User avatar + name at bottom with plan badge (Free / Pro / Growth)
   - Sign out button
   - Active route highlighted with aurora violet
   - Collapsed to icon-only on mobile

3. components/layout/Navbar.tsx:
   - Page title (dynamic, from layout context or page metadata)
   - Notification bell with unread count badge → opens NotificationPanel (built in Prompt 17)
   - User avatar dropdown: Profile, Billing, Sign Out

4. app/(dashboard)/dashboard/page.tsx — overview dashboard:
   - Stats row: Total Datasets | Synthetic Generated | Jobs This Month | Jobs Remaining (quota)
   - Recent Jobs table: last 5 synthetic_datasets with status badges and trust score if complete
   - Quick actions: "Upload Dataset" button, "View All Datasets" button
   - Empty state if no datasets yet: illustrated empty state + "Upload your first dataset" CTA
   - All data from Supabase via TanStack React Query

5. components/shared/EmptyState.tsx — reusable empty state with icon, title, description, CTA button props
6. components/shared/LoadingSpinner.tsx — centered spinner
7. components/shared/CardSkeleton.tsx — skeleton loader for stat cards
8. components/shared/TableSkeleton.tsx — skeleton loader for tables
```

---

## PROMPT 4 — Upload UI + Dropzone

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the dataset upload page with drag-and-drop, schema preview, and onboarding flow.

Create the following:
1. app/(dashboard)/upload/page.tsx — upload page:
   - If user has zero datasets: show onboarding banner "New here? Try it with our sample dataset" with a "Load Sample Dataset" button (downloads a pre-built Nigerian retail transactions CSV from Supabase storage, auto-populates the form)
   - Dataset name input (auto-filled from filename, editable)
   - Optional description textarea
   - Dropzone component

2. components/upload/Dropzone.tsx — drag-and-drop:
   - Accepts: .csv, .json, .parquet, .xlsx only
   - Free tier max: 10MB / Pro+Growth: 500MB (enforced client-side, also backend)
   - File type icon + name + size shown after selection
   - Upload progress bar (axios onUploadProgress)
   - Drag active state: border turns aurora violet, background shifts
   - Error state: wrong file type, too large
   - On upload: POST /api/v1/datasets (multipart/form-data)

3. components/upload/SchemaPreview.tsx — shown after upload success:
   - Summary: X rows, Y columns
   - Table: Column Name | Detected Type | Null % | Sample Values
   - Type badges: numeric (blue), categorical (violet), datetime (green), boolean (yellow), text (gray)
   - Row count warning: if row_count > 10,000 and user is on free plan, show "Free plan is capped at 10k rows — upgrade to Pro for larger datasets"
   - "Generate Synthetic Data" button → navigates to /generate/[dataset_id]
   - "Upload Different File" button

4. Onboarding guide — first-time user experience:
   - Step indicator: 1. Upload → 2. Generate → 3. Download
   - Shown only when profile.jobs_used_this_month == 0 (first job ever)
   - Auto-dismisses after first generation completes

Use TanStack React Query useMutation for upload. Show proper loading, error, success states with Sonner toasts.
```

---

## PROMPT 5 — FastAPI Backend + File Handling

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the complete FastAPI backend scaffold with file upload, storage, and quota enforcement.

Create the following:
1. backend/app/main.py — FastAPI app:
   - CORS: allow FRONTEND_URL env var + localhost:3000
   - Router includes: datasets, generate, reports, api_keys, webhooks
   - Health check: GET /health → {"status":"ok","version":"1.0.0"}
   - All routes under /api/v1
   - Startup: log config on boot
   - No server header (--no-server-header in startCommand)

2. backend/app/config.py — Settings (pydantic-settings):
   - SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
   - MODAL_API_URL, MODAL_API_SECRET
   - FRONTEND_URL, ALLOWED_ORIGINS
   - FREE_JOBS_QUOTA=10, FREE_ROW_CAP=10000
   - PRO_ROW_CAP=500000, GROWTH_ROW_CAP=5000000

3. backend/app/middleware/auth.py — JWT dependency:
   - Detect alg from JWT header: HS256 → verify locally, ES256 → verify via Supabase /auth/v1/user
   - Return user_id (sub claim)
   - 401 on invalid/missing token
   - Also handles API key auth: if Bearer token starts with "sk_live_", route to API key verification

4. backend/app/services/supabase.py — singleton Supabase client (service role)

5. backend/app/services/storage.py:
   - upload_file(bucket, path, file_bytes, content_type) → path
   - get_signed_url(bucket, path, expires_in=3600) → URL
   - delete_file(bucket, path)

6. backend/app/routers/datasets.py:
   - POST /api/v1/datasets — multipart upload:
     • Validate MIME type + magic bytes (python-magic)
     • Enforce size cap by plan (free: 50MB, pro/growth: 500MB)
     • Store at datasets/{user_id}/{dataset_id}/{uuid}.{ext}
     • Run schema detection (see Prompt 6)
     • Return full dataset object with schema
   - GET /api/v1/datasets — list user's datasets
   - GET /api/v1/datasets/{id} — dataset detail
   - DELETE /api/v1/datasets/{id} — delete + remove from storage

7. backend/app/dependencies/quota.py — quota check dependency:
   - Check profile.plan
   - Free: max FREE_JOBS_QUOTA jobs/month → 402 if exceeded
   - Free: enforce FREE_ROW_CAP (10,000 rows) — if dataset.row_count > 10000, reject with 402
   - Pro/Growth: no job limit
   - Returns 402 with {"error":"free_limit_reached","message":"...","upgrade_url":"/settings/billing"}

8. backend/app/models/schemas.py — all Pydantic models
9. backend/render.yaml — web service config, startCommand with --no-server-header
10. backend/requirements.txt

All protected routes use Depends(get_current_user).
```

---

## PROMPT 6 — Schema Detection Engine

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the automatic schema detection engine.

Create backend/app/services/schema_detector.py:

Function: detect_schema(file_bytes: bytes, file_type: str) → dict

For CSV, Excel (pandas), JSON (pd.json_normalize), Parquet (pd.read_parquet):
- Load into DataFrame
- For each column detect:
  • data_type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text'
  • null_percentage: % null values
  • unique_count: distinct value count
  • sample_values: 3 non-null samples
  • stats: min/max/mean for numeric; top_3_values for categorical

Detection logic:
- boolean: ≤2 unique non-null values (true/false, yes/no, 0/1)
- datetime: pd.to_datetime() succeeds on >80% of non-null values
- numeric: dtype is int or float
- categorical: object dtype AND (unique_count < 50 OR unique_count/total < 0.05)
- text: everything else (high-cardinality strings)

Return:
{
  "row_count": int,
  "column_count": int,
  "file_size_bytes": int,
  "columns": [
    {
      "name": str,
      "data_type": str,
      "null_percentage": float,
      "unique_count": int,
      "sample_values": list,
      "stats": dict
    }
  ]
}

Handle errors gracefully: corrupted files, empty files, files with >1000 columns (reject with 400), files with 0 rows (reject with 400).

Update POST /api/v1/datasets to run detect_schema after upload, save schema to datasets table, update row_count and column_count.
```

---

## PROMPT 7 — Modal.com ML Pipeline Setup

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Set up the Modal.com ML pipeline as a serverless GPU service.

1. modal_ml/main.py — Modal app entry point:

   Container image: debian_slim(python_version="3.11")
   Dependencies: sdv, ctgan, scikit-learn, scipy, presidio-analyzer, presidio-anonymizer,
                 ydata-profiling, matplotlib, seaborn, reportlab, supabase, pandas, pyarrow, fastapi
   Run: python -m spacy download en_core_web_lg

   @app.function(image=ml_image, gpu="T4", timeout=3600, secrets=[modal.Secret.from_name("syntho-secrets")])
   @modal.web_endpoint(method="POST")
   async def run_job(payload: dict):
     - Validate X-API-Secret header against MODAL_API_SECRET env var — return 401 if wrong
     - Validate payload has: synthetic_dataset_id, dataset_file_path, method, config, user_id
     - Spawn background: generate_synthetic.spawn(payload)
     - Return immediately: {"status": "accepted"}

   # NOTE: Gaussian Copula does NOT require GPU — it runs on CPU via SDV.
   # GPU is only needed for CTGAN. For Launch, both run in the same Modal function
   # (simplicity). In v2, split: gaussian_copula → backend CPU, CTGAN → Modal GPU only.
   @app.function(image=ml_image, gpu="T4", timeout=3600, secrets=[modal.Secret.from_name("syntho-secrets")])
   async def generate_synthetic(payload: dict):
     - update_job_progress(id, 5, 'running', 'Starting job')
     - Download original file from Supabase storage
     - Load into pandas DataFrame
     - Dispatch by method:
       • 'gaussian_copula' → sdv_generator.generate_gaussian_copula()
       • 'ctgan' → ctgan_generator.generate_ctgan()
     - Upload synthetic CSV to synthetic/{user_id}/{synthetic_id}/data.csv
     - Run in sequence: privacy_scorer → quality_reporter → compliance_reporter
     - Compute composite trust score (see Prompt 13 for formula)
     - Update trust_scores table
     - update_job_progress(id, 100, 'completed', 'Done')
     - On any exception: update_job_progress(id, 0, 'failed', str(e))

2. modal_ml/utils.py:
   - supabase_client() → Supabase client
   - update_job_progress(synthetic_dataset_id, progress, status, message)
   - download_from_storage(bucket, path) → bytes
   - upload_to_storage(bucket, path, file_bytes, content_type)
   - log_job_event(synthetic_dataset_id, event, message)

3. backend/app/services/modal_client.py:
   - trigger_modal_job(payload: dict) → None
   - POST to MODAL_API_URL with X-API-Secret header
   - httpx async, 30s timeout, retry once on connection error

4. backend/app/routers/generate.py:
   - POST /api/v1/generate — body: {dataset_id, method, num_rows, config}
     • Depends(get_current_user), Depends(check_generation_quota)
     • Validate method: free plan can only use 'gaussian_copula'
     • Create synthetic_datasets record (status: pending)
     • trigger_modal_job(payload)
     • Return synthetic_dataset object
   - GET /api/v1/generate/{id}/status — current job status + progress
   - PATCH /api/v1/generate/{id}/cancel — set status='failed', error_message='Cancelled by user'
   - GET /api/v1/synthetic — list user's synthetic datasets
   - GET /api/v1/synthetic/{id} — single synthetic dataset with all scores
   - GET /api/v1/synthetic/{id}/download — signed URL for data.csv
```

---

## PROMPT 8 — Gaussian Copula Generator

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the SDV Gaussian Copula generator (free tier method).

1. modal_ml/sdv_generator.py:

   Function: generate_gaussian_copula(df: pd.DataFrame, config: dict, synthetic_dataset_id: str) → pd.DataFrame

   Steps:
   a. Build SDV SingleTableMetadata from df (auto-detect column types)
   b. Initialize GaussianCopulaSynthesizer(metadata, enforce_min_max_values=True, enforce_rounding=True)
   c. update_job_progress(id, 10, 'running', 'Fitting model')
   d. synthesizer.fit(df)
   e. update_job_progress(id, 60, 'running', 'Generating data')
   f. num_rows = config.get('num_rows', len(df)) — cap at 10,000 if user on free plan (check config flag)
   g. synthetic_df = synthesizer.sample(num_rows=num_rows)
   h. update_job_progress(id, 80, 'running', 'Validating output')
   i. Return synthetic_df

   Handle SDV errors gracefully: if fit fails due to constant columns, drop them and retry.

2. app/(dashboard)/generate/[id]/page.tsx — generation config page:
   - Shows original dataset summary: name, rows, columns, file size, top 3 column types
   - Method selector:
     • "Gaussian Copula" — badge: "Fast · Statistical" — available on all plans
     • "CTGAN (Deep Learning)" — badge: "Accurate · GPU-powered" — Pro/Growth badge with lock icon for free users
   - Number of rows input (default: same as original; free tier: max 10,000)
   - "Generate Now" button → POST /api/v1/generate
   - After submit: replace page content with JobProgress component (full-screen)
   - Free users see a locked CTGAN option with tooltip: "Upgrade to Pro to use CTGAN"
```

---

## PROMPT 9 — CTGAN Generator (Pro/Growth Only)

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the CTGAN GAN-based generator (Pro and Growth plans only).

1. modal_ml/ctgan_generator.py:

   Function: generate_ctgan(df: pd.DataFrame, config: dict, synthetic_dataset_id: str) → pd.DataFrame

   Steps:
   a. Identify discrete columns: dtype == object, or bool, or numeric with <20 unique values
   b. Initialize CTGANSynthesizer(epochs=config.get('epochs',300), batch_size=config.get('batch_size',500), verbose=True)
   c. update_job_progress(id, 5, 'running', 'Initializing CTGAN')
   d. Wrap fit() to emit progress every 10 epochs:
      progress = 5 + (current_epoch / total_epochs) * 70
      Call update_job_progress() and also check synthetic_datasets.status in Supabase
      If status == 'failed' (user cancelled): raise CancelledError
   e. synthesizer.fit(df, discrete_columns=discrete_columns)
   f. update_job_progress(id, 80, 'running', 'Sampling synthetic rows')
   g. num_rows = config.get('num_rows', len(df))
   h. synthetic_df = synthesizer.sample(num_rows=num_rows)
   i. update_job_progress(id, 90, 'running', 'Validating output')
   j. Return synthetic_df

2. Backend enforcement — backend/app/routers/generate.py:
   - If method == 'ctgan' and profile.plan == 'free': raise HTTPException(402, "CTGAN requires Pro plan. Upgrade at /settings/billing")

3. Update app/(dashboard)/generate/[id]/page.tsx:
   - When CTGAN selected by Pro/Growth user, show additional config:
     • Epochs slider (100–500, default 300)
     • Batch size select (250/500/1000, default 500)
     • Info callout: "CTGAN uses GPU acceleration — typical runtime: 5–15 min"
   - Estimate time label: "{rows} rows × {epochs} epochs ≈ ~{estimated} minutes"
```

---

## PROMPT 10 — Privacy Scorer

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the privacy risk scoring system using Microsoft Presidio.

1. modal_ml/privacy_scorer.py:

   Function: score_privacy(original_df: pd.DataFrame, synthetic_df: pd.DataFrame, synthetic_dataset_id: str) → dict

   Steps:
   a. PII Detection (Presidio AnalyzerEngine):
      - For each text/categorical column in synthetic_df, sample min(50, len) rows
      - Detect: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, CREDIT_CARD, US_SSN, LOCATION, DATE_TIME, IP_ADDRESS, URL
      - Flag column if PII detected in >10% of samples
      - pii_penalty = -20 per flagged column, max -60

   b. Singling Out Risk:
      - For each combination of up to 3 columns, compute uniqueness ratio in synthetic_df
      - singling_out_penalty = -20 if any combo has uniqueness > 0.15

   c. Row Overlap (Linkability):
      - Sample 200 rows from synthetic_df
      - For each sampled row, check exact match in original_df on key columns
      - overlap_pct = matched / 200
      - linkability_penalty = -20 if overlap_pct > 0.05

   d. Compute score: max(0, 100 + pii_penalty + singling_out_penalty + linkability_penalty)

   e. Risk level:
      80–100 → 'low' (green)
      60–79  → 'medium' (yellow)
      40–59  → 'high' (orange)
      0–39   → 'critical' (red)

   f. Save to privacy_scores table
   g. update_job_progress(id, 85, 'running', 'Privacy scoring complete')
   h. Return {overall_score, risk_level, pii_detected, details}

2. Return value is passed to compliance_reporter and trust score computation.
```

---

## PROMPT 11 — Compliance PDF (Headline Feature)

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the GDPR + HIPAA compliance PDF generator. This is a headline feature — treat it as the product's main value prop.

1. modal_ml/compliance_reporter.py:

   Function: generate_compliance_report(original_df, synthetic_df, privacy_result, synthetic_dataset_id, dataset_name) → bytes

   GDPR checks (each returns True/False + explanation):
   - no_direct_identifiers: No names/emails/IDs detected by Presidio
   - no_quasi_identifiers: Privacy score > 60
   - data_minimization: Column count ≤ original
   - no_special_categories: No health/religion/political data detected (keyword heuristic on column names + samples)
   - cannot_be_traced: Row overlap < 5%

   HIPAA checks:
   - no_phi: privacy score > 70 AND no PHI entity types detected (PERSON, US_SSN, PHONE_NUMBER, EMAIL_ADDRESS, IP_ADDRESS)
   - safe_harbor_applied: All 18 PHI identifiers absent or de-identified
   - deidentification_verified: privacy score > 70

   PDF structure (ReportLab, Syntho brand colors — violet #a78bfa, cyan #06b6d4, dark bg for headers):
   Page 1 — Cover:
     - Syntho logo, report title "Synthetic Data Compliance Report"
     - Dataset name, generation method, generated date
     - Overall verdict: PASSED (green) or FAILED (red), large badge
   
   Page 2 — Executive Summary:
     - Composite Trust Score (large number), privacy score, fidelity score
     - 2-sentence plain-English summary: "This synthetic dataset passed all GDPR checks and HIPAA safe harbor criteria. It is safe for use in development, testing, and sharing."
   
   Page 3 — GDPR Section:
     - Each check: ✓ or ✗, check name, plain-English explanation
   
   Page 4 — HIPAA Section:
     - Same format
   
   Page 5 — Recommendations (only if any check failed):
     - What to fix, how to fix it
   
   Footer on all pages: "Generated by Syntho · syntho.vercel.app · For informational purposes only · Not legal advice"

2. Upload PDF to: reports/{synthetic_dataset_id}/compliance.pdf
3. Save to compliance_reports table (passed, gdpr_passed, hipaa_passed, findings, file_path)
4. update_job_progress(id, 95, 'running', 'Compliance report generated')
5. Return compliance_result dict for trust score computation

Backend:
- GET /api/v1/reports/compliance/{synthetic_dataset_id} — returns compliance data + signed PDF URL
- GET /api/v1/reports/compliance/{synthetic_dataset_id}/pdf — redirect to signed URL
```

---

## PROMPT 12 — Quality Report + Correlation Validator

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the quality report and correlation preservation validator.

1. modal_ml/correlation_validator.py:

   Function: validate_correlations(original_df: pd.DataFrame, synthetic_df: pd.DataFrame) → dict

   a. Numeric columns: Pearson correlation matrix for both, compute |corr_orig - corr_synth| per pair
      correlation_score = (1 - mean(abs_diffs)) × 100

   b. Per-column distribution similarity:
      - Numeric: KS test (scipy.stats.ks_2samp) — flag if KS statistic > 0.10
      - Categorical: chi-squared on value frequencies — flag if p < 0.05

   c. distribution_score = (passing columns / total columns) × 100
   d. overall_score = (correlation_score + distribution_score) / 2
   e. passed = correlation_score > 75 AND distribution_score > 80

2. modal_ml/quality_reporter.py:

   Function: generate_quality_stats(original_df: pd.DataFrame, synthetic_df: pd.DataFrame, synthetic_dataset_id: str) → dict

   For each column:
   - original_stats: {mean, median, std, min, max, null_pct, top_values}
   - synthetic_stats: same
   - distribution_data: binned frequencies (20 bins numeric, top 10 categories)
   - drift_score: 1 - ks_statistic for numeric, chi2 p-value for categorical

   Save to quality_reports table. update_job_progress(id, 92, 'running', 'Quality analysis complete')
   Return {correlation_score, distribution_score, overall_score, column_stats, passed}

3. Backend:
   - GET /api/v1/reports/quality/{synthetic_dataset_id} — quality report data
   - GET /api/v1/reports/privacy/{synthetic_dataset_id} — privacy score data

Note: These scores feed into the composite trust score (Prompt 13). Do NOT show these as separate UI screens — they are data sources for the trust score breakdown.
```

---

## PROMPT 13 — Composite Trust Score UI

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the composite trust score — the single 0–100 number users see after generation. This replaces separate privacy/quality/compliance report tabs. Everything lives on one page.

Trust Score Formula (computed in Modal, saved to trust_scores table):
  composite = (privacy_score × 0.40) + (fidelity_score × 0.40) + (compliance_score × 0.20)
  fidelity_score = quality_reports.overall_score
  compliance_score = 100 if compliance_reports.passed else 50 (partial credit if gdpr_passed XOR hipaa_passed)
  All inputs clamped 0–100. Final composite clamped 0–100.

Label:
  90–100 → "Excellent"
  75–89  → "Good"
  60–74  → "Fair"
  0–59   → "Needs Improvement"

1. app/(dashboard)/datasets/[id]/page.tsx — synthetic dataset result page:

   Layout (single scrollable page, no tabs):

   SECTION 1 — Hero Score Bar:
   - Large circular gauge (Recharts RadialBarChart, 200px)
   - Composite score number in center (e.g. "87")
   - Label below gauge ("Good")
   - Color: green (≥75), yellow (60–74), orange (40–59), red (<40)
   - Three sub-scores in a row below gauge:
     Privacy [score] · Fidelity [score] · Compliance [score]
   - Primary CTA: "Download Compliance PDF" button (aurora violet, prominent)
   - Secondary CTA: "Download Synthetic Data (.csv)" button

   SECTION 2 — What This Means:
   - 2–3 sentence plain-English interpretation of the score
   - Green checkmarks for passed checks, red X for failed
   - GDPR: Passed / Failed  |  HIPAA: Passed / Failed
   - PII Risk: Low / Medium / High / Critical

   SECTION 3 — Privacy Breakdown:
   - Risk level badge (color coded)
   - List of detected PII columns (if any) with entity type badges
   - Singling out risk indicator
   - Row overlap percentage

   SECTION 4 — Fidelity Breakdown:
   - Correlation score + distribution score
   - Column-by-column comparison (DistributionChart from components/charts/)
   - Stats table: Column | Original Mean | Synthetic Mean | Drift
   - CorrelationHeatmap (side by side, original vs synthetic)

   SECTION 5 — Generation Details:
   - Method used, rows generated, generation time, original dataset link
   - "Regenerate with different settings" button → /generate/[original_dataset_id]

2. components/reports/TrustScore.tsx — the hero score gauge component:
   - Props: composite_score, privacy_score, fidelity_score, compliance_score, label
   - Animated fill on mount (CSS transition)
   - Accessible: aria-label with full score description

3. components/charts/DistributionChart.tsx — per-column bars:
   - Side-by-side ComposedChart: original (violet), synthetic (cyan)
   - Numeric: histogram bins; Categorical: top-10 value frequencies

4. components/charts/CorrelationHeatmap.tsx — custom SVG grid:
   - Original vs synthetic side by side
   - Color: deep blue (strong negative) → white → deep red (strong positive)
   - Hover tooltip with exact value

5. Backend:
   - GET /api/v1/synthetic/{id} — returns synthetic_dataset + trust_score + privacy_scores + quality_reports + compliance_reports in a single response (join in Python, not multiple round trips)
```

---

## PROMPT 14 — Real-Time Job Progress

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the real-time job progress tracking UI using Supabase Realtime.

1. hooks/useJobProgress.ts — Supabase Realtime hook:
   - Subscribe to synthetic_datasets table for a specific id via supabase.channel().on('postgres_changes')
   - Return: {progress, status, syntheticDataset, error}
   - Fallback: poll GET /api/v1/generate/{id}/status every 5 seconds if Realtime fails
   - Auto-unsubscribe on unmount

2. components/shared/JobProgress.tsx — full job progress UI:
   - Animated progress bar (CSS transition, aurora gradient fill)
   - Step indicators with status:
     1. File Uploaded ✓
     2. Schema Detected ✓
     3. Training Model (spinner when active)
     4. Generating Data
     5. Scoring Privacy
     6. Generating Reports
     7. Complete
   - Elapsed time counter (counts up from job start)
   - Estimated time remaining (from progress rate)
   - Expandable log panel: shows job_logs entries from Supabase Realtime
   - Cancel button → PATCH /api/v1/generate/{id}/cancel (with confirm dialog)
   - On complete: "View Results" button → /datasets/[id]
   - On fail: error message + "Try Again" button → /generate/[original_id]

3. app/(dashboard)/generate/[id]/page.tsx — updated flow:
   - Pre-generation: show dataset summary + config form (Prompts 8/9)
   - Post-submit: replace entire page with full-screen JobProgress
   - On complete: auto-redirect to /datasets/[synthetic_id] after 3s countdown
   - Job start timestamp stored in localStorage for elapsed time calculation

4. app/(dashboard)/dashboard/page.tsx — dashboard active jobs:
   - If any jobs are in 'running' or 'pending' state, show active job mini-card at top
   - Mini-card: dataset name + progress bar + status + "View" link
```

---

## PROMPT 15 — Freemium Quota System + Billing Page

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the freemium quota enforcement and billing/upgrade page.

1. Quota enforcement (already scaffolded in Prompt 5 — now wire it completely):

   backend/app/dependencies/quota.py:
   - get_user_plan(user_id) → profile with plan, jobs_used_this_month, quota_reset_at
   - check_generation_quota(user, dataset):
     • Free: jobs_used_this_month >= 10 → 402 with upgrade_url
     • Free: dataset.row_count > 10,000 → 402 "Dataset exceeds free tier row cap of 10,000"
     • Free + method=='ctgan' → 402 "CTGAN requires Pro plan"
     • Pro/Growth: no quota check

   After job completes (in modal_ml/utils.py), increment profiles.jobs_used_this_month via Supabase update.

2. app/(dashboard)/settings/billing/page.tsx — billing page:

   SECTION 1 — Current Plan:
   - Plan badge (Free / Pro / Growth), renewal date if paid
   - Usage meter: X of 10 jobs used this month (progress bar, red when ≥8)
   - Row cap info: "10,000 rows max per job" for free

   SECTION 2 — Upgrade Plans (shown to Free users):
   Three cards side by side:
   - Free: ₦0/mo, 10 jobs, 10k rows, Gaussian Copula, no API keys — current (if free)
   - Pro: ₦5,000/mo, Unlimited jobs, 500k rows, CTGAN, API Keys — "Upgrade" button
   - Growth: ₦15,000/mo, everything in Pro + priority GPU + PDF branding — "Upgrade" button

   Upgrade buttons → Flutterwave checkout (useFlutterwave hook):
   - tx_ref: "SYNTHO-SUB-{userId}-{plan}-{Date.now()}"
   - amount: 5000 or 15000
   - currency: 'NGN'
   - On success: POST /api/v1/billing/upgrade with tx_ref
   - Backend verifies payment, updates profiles.plan

   SECTION 3 — Payment History:
   - Table: Date | Plan | Amount | Status

3. backend/app/routers/billing.py (new router):
   - POST /api/v1/billing/upgrade — verify Flutterwave tx, update profile.plan
   - GET /api/v1/billing/status — current plan, jobs_used, quota_reset_at

4. Quota warning on dashboard:
   - If free user and jobs_used >= 8: show banner "You've used {n}/10 free jobs this month. Upgrade for unlimited access."
   - If quota exhausted: banner turns red, generate button disabled with tooltip
```

---

## PROMPT 16 — API Keys (Launch Feature)

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build API key management — available to Pro and Growth users at launch.

1. app/(dashboard)/api-keys/page.tsx:

   Header: "API Keys" + subtitle "Integrate Syntho into your ML pipeline"

   SECTION 1 — Create Key (Pro/Growth only):
   - If free user: show upgrade prompt card instead of create form
   - "Create New API Key" button → opens Dialog
   - Dialog: name input, scope checkboxes (generate, read)
   - On create: show full key ONCE in a copy-to-clipboard box with warning "Save this key — we won't show it again"
   - On copy or close: key is gone from UI permanently

   SECTION 2 — Keys Table:
   - Columns: Name | Key Prefix | Scopes | Usage Count | Last Used | Created | Revoke
   - Empty state: "No API keys yet. Create your first key to start."
   - Revoke: confirm dialog, then DELETE /api/v1/api-keys/{id}

   SECTION 3 — Quick Start Code:
   - Tabs: Python | JavaScript | cURL
   - Python example showing: upload dataset, start generation, poll status, download result
   - JavaScript (fetch) equivalent
   - cURL equivalent
   - Base URL shown with copy button: NEXT_PUBLIC_API_URL value

2. backend/app/routers/api_keys.py:
   - POST /api/v1/api-keys — create key:
     • Require Pro/Growth plan (check profile.plan, 402 if free)
     • key = "sk_live_" + secrets.token_urlsafe(36)
     • Store: key_hash=SHA256(key), key_prefix=key[:12]
     • Return full key once in response
   - GET /api/v1/api-keys — list keys (prefix + metadata only, never hash or full key)
   - DELETE /api/v1/api-keys/{id} — revoke (set is_active=False)

3. backend/app/middleware/auth.py — API key auth path:
   - If Authorization starts with "Bearer sk_live_":
     • Hash the key, look up api_keys table
     • Verify is_active=True AND (expires_at IS NULL OR expires_at > NOW())
     • Verify scope matches the route being called
     • Increment usage_count, update last_used_at
     • Attach user_id to request state
   - API key users get same endpoints as JWT users

4. Sidebar nav: "API Keys" link always visible (no feature flag). Free users see the page but with upgrade wall.
```

---

## PROMPT 17 — In-App Notifications

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the in-app notification system. Notifications are created server-side and delivered via Supabase Realtime.

Notification types for Launch:
- job_complete: "Your synthetic dataset is ready" → link to /datasets/[synthetic_id]
- job_failed: "Generation failed — [error message]" → link to /generate/[original_id]
- quota_warning: "You've used 8 of 10 free jobs this month" → link to /settings/billing
- quota_exhausted: "Monthly quota reached — upgrade to continue" → link to /settings/billing

1. backend — create notifications in modal_ml/utils.py:
   Function: create_notification(user_id, type, title, message, link)
   - INSERT into notifications table via Supabase service role client
   - Called after job completes/fails in generate_synthetic()
   - Called after quota check in backend/app/dependencies/quota.py

2. hooks/useNotifications.ts:
   - Subscribe to notifications table WHERE user_id = current_user.id via Supabase Realtime
   - Return: {notifications, unreadCount, markAsRead(id), markAllRead}
   - On new notification: trigger Sonner toast ("Your synthetic dataset is ready!" with link)
   - Load initial notifications from GET /api/v1/notifications on mount

3. components/shared/NotificationPanel.tsx — slide-out panel (triggered from Navbar bell):
   - List of notifications, newest first
   - Each item: icon (by type), title, message, relative time, unread indicator dot
   - Click → navigate to link + mark as read
   - "Mark all as read" button
   - "No notifications yet" empty state
   - Max 50 notifications shown, "Load more" button

4. components/layout/Navbar.tsx — update bell icon:
   - Shows unread count badge (red dot with number)
   - Click → toggles NotificationPanel (Sheet component from shadcn/ui)

5. backend/app/routers/notifications.py (new):
   - GET /api/v1/notifications — list user's notifications (newest first, limit 50)
   - PATCH /api/v1/notifications/{id}/read — mark as read
   - PATCH /api/v1/notifications/read-all — mark all read
```

---

## PROMPT 18 — Error Handling + Loading States + Onboarding

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Polish every error state, loading state, and build the first-time user onboarding flow.

1. Global error handling:
   - app/error.tsx — Next.js error boundary: full-page error with "Reload" and "Go to Dashboard" buttons. Aurora design.
   - app/not-found.tsx — 404 page with illustration, back to dashboard link
   - lib/api.ts — Axios interceptors:
     • 401 → clear session, redirect to /login
     • 402 → show upgrade modal (reusable UpgradeModal component)
     • 429 → show toast "Too many requests — please wait a moment"
     • 500 → show toast "Something went wrong on our end. Try again."
   - Never expose raw error messages to users. Map backend error codes to friendly copy.

2. Loading states — ensure every page has proper skeletons:
   - /datasets → TableSkeleton while loading
   - /dashboard → CardSkeleton × 4 for stats row
   - /datasets/[id] → full page skeleton while trust score loads
   - Suspense boundaries with fallbacks everywhere data is async

3. Empty states — every list/table needs one:
   - /datasets with no datasets: illustration, "Upload your first dataset" CTA
   - /api-keys with no keys: code icon, "Create your first API key" CTA
   - /dashboard with no activity: "Get started in 3 steps" guide

4. UpgradeModal component (reusable):
   - Triggered by 402 responses or locked feature clicks
   - Shows what the user hit the limit on + upgrade CTA
   - Plan comparison (compact: 3 columns)
   - "Upgrade to Pro" button → /settings/billing
   - "Maybe later" dismiss

5. First-time onboarding flow:
   - Triggered when: profile.jobs_used_this_month == 0 AND profile created_at < 24h ago
   - Overlay wizard (3 steps, dismissable):
     Step 1: "Welcome to Syntho. Upload a dataset." (arrow points to Upload nav item)
     Step 2: "Choose how to generate." (shown on generate page)
     Step 3: "Download your compliance PDF." (shown on result page)
   - "Load Sample Dataset" shortcut on step 1 — auto-loads Nigerian retail CSV, goes straight to generate page
   - Progress dots at bottom, skip button in top-right

6. Rate limiting feedback:
   - Rate-limited API routes show toast with countdown: "Rate limited. Try again in {n} seconds."

7. Offline detection:
   - When browser goes offline: show persistent top banner "No internet connection"
   - Auto-dismiss when back online
```

---

## PROMPT 19 — Dataset List + Detail Pages

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Build the complete datasets list page and the original dataset detail page.

1. app/(dashboard)/datasets/page.tsx — all datasets:
   - Header: "My Datasets" + "Upload New" button
   - Search input (client-side filter by name)
   - Filter: All | Original | Synthetic
   - Sort: Newest | Oldest | Most Rows
   - DatasetTable component (see below)
   - Empty state (Prompt 18)

2. components/datasets/DatasetTable.tsx:
   Columns: Name | Type (Original/Synthetic) | Rows | Status | Trust Score | Created | Actions
   - Status badge: uploaded (gray) | ready (green) | processing (yellow spinner) | error (red)
   - Trust score: if synthetic + completed, show composite score badge (color coded)
   - Actions: View (→ detail page), Generate Synthetic (→ /generate/[id], only for original), Delete
   - Pagination: 20 per page

3. app/(dashboard)/datasets/[id]/page.tsx — handles BOTH original dataset detail AND synthetic result:

   If it's an ORIGINAL dataset:
   - Dataset header: name, file type badge, row/column count, upload date
   - Schema table: all columns with types, null %, sample values
   - Synthetic generations section: list of all synthetic datasets generated from this one
     Each row: method, rows, trust score, status, created date, View / Download actions
   - "Generate New Synthetic" button → /generate/[id]

   If it's a SYNTHETIC dataset:
   - Show the composite trust score page (from Prompt 13)
   - TrustScore hero gauge + all breakdown sections
   - "Back to original dataset" breadcrumb

4. Handle the routing:
   - /datasets/[id] → check if id is in datasets table (original) or synthetic_datasets (synthetic)
   - Backend: GET /api/v1/datasets/{id} handles both — returns type field in response
   - Or: use /datasets/[id] for originals, /results/[id] for synthetic — pick ONE approach and be consistent
```

---

## PROMPT 20 — Deployment + Production Config

```
[READ CONTEXT.MD HERE]
[READ SECURITY.MD HERE]
[READ DESIGN.MD HERE]

Task: Finalize all deployment config and make the project production-ready.

1. Modal deployment:
   - modal_ml/modal.toml (or setup instructions)
   - modal secret create syntho-secrets with SUPABASE_URL, SUPABASE_SERVICE_KEY, MODAL_API_SECRET
   - modal deploy modal_ml/main.py
   - Copy web endpoint URL → MODAL_API_URL in backend .env

2. backend/render.yaml — complete Render config:
   - name: syntho-backend
   - env: python
   - buildCommand: pip install -r requirements.txt
   - startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-server-header
   - All env var names listed (values added in Render dashboard)
   - healthCheckPath: /health

3. backend/.env.production.example — every env var with description comments

4. frontend/vercel.json — complete config:
   - Security headers: CSP (self + Supabase + Vercel + Modal domains), HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
   - No rewrites needed (API calls go directly to Render)

5. frontend/.env.production.example — all NEXT_PUBLIC_ vars + comments

6. Supabase production checklist:
   - Run all migrations 001–005 in order
   - Enable pg_cron extension
   - Enable Realtime for synthetic_datasets and notifications tables
   - Create storage buckets: datasets, synthetic, reports (private)
   - Configure storage policies from migration 003
   - Add Vercel URL to Supabase Auth → URL Configuration → Redirect URLs
   - Enable Google and GitHub OAuth providers

7. CORS final config:
   - backend/app/main.py: ALLOWED_ORIGINS from env var (comma-separated list)
   - Include both Vercel preview URL pattern and production URL

8. Health monitoring:
   - UptimeRobot: ping https://syntho-backend.onrender.com/health every 5 min
   - Render free tier sleeps after 15min inactivity — UptimeRobot keeps it warm

9. Pre-launch security checklist (enforce these before going live):
   - [ ] No secrets in git history (run git log --all -p | grep -i "secret\|key\|password")
   - [ ] All Supabase RLS policies verified (test with non-admin user JWT)
   - [ ] Rate limiting active on all /api/v1/ routes
   - [ ] File upload: MIME + magic bytes validation in place
   - [ ] Flutterwave webhook hash verified on every webhook
   - [ ] All error responses return generic messages (no stack traces)
   - [ ] HTTPS enforced (Vercel and Render both handle this)

10. Sample dataset:
    - Create a Nigerian retail transactions CSV (1,000 rows, 8 columns: transaction_id, date, amount_ngn, category, region, payment_method, customer_age_group, product_count)
    - Upload to Supabase Storage: datasets/sample/nigerian_retail_sample.csv
    - Update NEXT_PUBLIC_SAMPLE_DATASET_PATH env var to this path
    - This is used by the onboarding "Load Sample Dataset" button (Prompt 18)
```

---

## Build Progress Tracker

| # | Module | Status |
|---|--------|--------|
| 1 | Project scaffold + design system | ⬜ |
| 2 | Supabase schema + auth | ⬜ |
| 3 | Layout + dashboard shell | ⬜ |
| 4 | Upload UI + dropzone + onboarding hint | ⬜ |
| 5 | FastAPI backend + file handling + quota | ⬜ |
| 6 | Schema detection engine | ⬜ |
| 7 | Modal.com ML pipeline setup | ⬜ |
| 8 | Gaussian Copula generator | ⬜ |
| 9 | CTGAN generator (Pro/Growth only) | ⬜ |
| 10 | Privacy risk scorer (Presidio) | ⬜ |
| 11 | Compliance PDF — headline feature | ⬜ |
| 12 | Quality report + correlation validator | ⬜ |
| 13 | Composite trust score UI | ⬜ |
| 14 | Real-time job progress | ⬜ |
| 15 | Freemium quota + billing page | ⬜ |
| 16 | API Keys (Launch feature) | ⬜ |
| 17 | In-app notifications | ⬜ |
| 18 | Error handling + loading states + onboarding | ⬜ |
| 19 | Dataset list + detail pages | ⬜ |
| 20 | Deployment + production config | ⬜ |
