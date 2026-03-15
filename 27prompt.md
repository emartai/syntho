# Syntho — 27 Build Prompts
## Complete Prompt Guide (Use with context.md + security.md)

> **How to use:** Paste `context.md` → `security.md` → `design.md` at the top of every Claude session, then paste the prompt for the module you are building. Update the status in your context.md progress tracker after each prompt is complete.
>
> **Why all three files?** `context.md` = what to build. `security.md` = how to build it safely. `design.md` = how it must look. Claude reads all three before writing a single line of code.

---

## PROMPT 1 — Project Scaffold + Environment Setup

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

You are building Syntho, a Synthetic Data Marketplace SaaS. 

Task: Scaffold the complete Next.js 14 frontend project with all configuration files.

Create the following:
1. next.config.js — with image domains and env setup
2. tailwind.config.ts — with shadcn/ui config + full Plasma Aurora design system from design.md (CSS variables, Clash Display + Satoshi + JetBrains Mono fonts, aurora keyframes)
3. tsconfig.json — strict mode
4. app/layout.tsx — root layout with Clash Display + Satoshi + JetBrains Mono fonts, dark mode (class strategy), AuroraBackground, Sonner toaster, TanStack Query provider
5. app/page.tsx — landing page with hero section: app name "Syntho", tagline "Generate Safe Synthetic Data at Scale", a CTA button "Get Started" linking to /login, and 4 feature cards (Upload, Generate, Score, Sell)
6. components/ui/ — install and configure: button, card, badge, input, label, dialog, tabs, progress, skeleton, toast via shadcn/ui
7. lib/utils.ts — cn() utility function
8. types/index.ts — TypeScript interfaces for: Dataset, SyntheticDataset, PrivacyScore, ComplianceReport, QualityReport, MarketplaceListing, Purchase, ApiKey, Profile, JobStatus
9. package.json — all dependencies from context.md
10. .env.local.example — all required env vars from context.md (no real values)

Make the landing page visually impressive using Tailwind — dark background, indigo gradient hero, animated gradient text for the headline.
```

---

## PROMPT 2 — Supabase Schema + Auth

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Set up Supabase authentication and database.

Create the following:
1. supabase/migrations/001_initial_schema.sql — complete SQL from context.md schema section. Include:
   - All 9 tables with correct types, constraints, foreign keys
   - Row Level Security (RLS) enabled on all tables
   - RLS policies: users can only read/write their own rows; marketplace_listings are publicly readable; admin role bypasses all policies
   - Storage bucket creation: 'datasets', 'synthetic', 'reports'
   - Storage policies: authenticated users can upload to their own folder; public can read marketplace preview data

2. lib/supabase/client.ts — browser Supabase client using createBrowserClient from @supabase/ssr
3. lib/supabase/server.ts — server Supabase client using createServerClient from @supabase/ssr (reads cookies)
4. middleware.ts — Next.js middleware to refresh sessions and protect routes under /(dashboard)
5. app/(auth)/login/page.tsx — login page with:
   - "Sign in with Google" button
   - "Sign in with GitHub" button  
   - Clean centered card design, Syntho logo/name at top
   - Handles redirect after login to /dashboard
6. app/(auth)/signup/page.tsx — same as login (Supabase OAuth handles both flows)
7. hooks/useAuth.ts — hook returning: user, profile, signOut, isLoading
8. Supabase trigger SQL: auto-create a profiles row when a new user signs up via auth

After auth, redirect user to /dashboard. Show loading spinner while session is being checked.
```

---

## PROMPT 3 — Layout + Dashboard Shell

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the main protected dashboard layout with sidebar navigation.

Create the following:
1. app/(dashboard)/layout.tsx — protected layout that:
   - Checks auth (redirect to /login if not authenticated)
   - Renders Sidebar + top Navbar
   - Wraps content in TanStack QueryClientProvider

2. components/layout/Sidebar.tsx — left sidebar with:
   - Syntho logo at top
   - Navigation links with icons (lucide-react):
     • Dashboard → /dashboard
     • My Datasets → /datasets
     • Upload → /upload
     • Marketplace → /marketplace  
     • Sell Data → /sell
     • API Keys → /api-keys
     • Billing → /billing
   - User avatar + name at bottom with sign out button
   - Active route highlighted in indigo
   - Collapsible on mobile

3. components/layout/Navbar.tsx — top bar with:
   - Page title (dynamic)
   - Notification bell icon
   - User avatar dropdown (profile, settings, sign out)

4. app/(dashboard)/dashboard/page.tsx — overview dashboard with:
   - Stats cards: Total Datasets, Synthetic Generated, API Calls This Month, Revenue Earned
   - Recent datasets table (last 5)
   - Quick action buttons: Upload Dataset, Browse Marketplace
   - All stats fetched from Supabase (real data, show 0 if empty)

5. components/shared/JobProgress.tsx — reusable component showing a job's progress bar + status badge. Accepts: jobId, status, progress props.
```

---

## PROMPT 4 — Upload UI + Dropzone

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the dataset upload page with drag-and-drop and schema preview.

Create the following:
1. app/(dashboard)/upload/page.tsx — full upload page

2. components/upload/Dropzone.tsx — drag-and-drop uploader using react-dropzone:
   - Accepts: .csv, .json, .parquet, .xlsx files only
   - Max file size: 100MB
   - Shows file name, size, type after selection
   - Upload progress bar (using axios onUploadProgress)
   - Drag active state (border turns indigo, background changes)
   - Error state for wrong file type
   - On upload success: calls POST /api/v1/datasets with the file

3. components/upload/SchemaPreview.tsx — schema preview table shown after upload:
   - Displays columns: Column Name, Detected Type, Null %, Sample Values (first 3)
   - Type badges: numeric (blue), categorical (purple), datetime (green), boolean (yellow), text (gray)
   - Row count and column count summary
   - "Looks correct? Generate Synthetic Data" button → navigates to /generate/[id]

4. Upload flow:
   - File selected → POST /api/v1/datasets (multipart/form-data)
   - Backend returns dataset id + detected schema
   - Frontend shows SchemaPreview with schema data
   - Dataset name input field (auto-filled from filename, user can edit)
   - Optional description textarea

5. After successful upload, show success toast and option to go to generate page.

Use TanStack React Query useMutation for the upload call. Show proper loading, error, and success states.
```

---

## PROMPT 5 — FastAPI Backend Setup + File Handling

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the complete FastAPI backend scaffold with file upload and storage endpoints.

Create the following:
1. backend/app/main.py — FastAPI app with:
   - CORS configured for Vercel frontend URL
   - Router includes for all routers
   - Health check endpoint GET /health
   - API versioning: all routes under /api/v1

2. backend/app/config.py — Settings class using pydantic-settings loading all env vars

3. backend/app/middleware/auth.py — middleware/dependency that:
   - Reads Bearer token from Authorization header
   - Verifies it's a valid Supabase JWT using SUPABASE_JWT_SECRET
   - Returns decoded user_id for use in route handlers
   - Returns 401 if token is invalid or missing

4. backend/app/services/supabase.py — Supabase client singleton using service role key

5. backend/app/services/storage.py — storage service with functions:
   - upload_file(bucket, path, file_bytes, content_type) → storage path
   - get_signed_url(bucket, path, expires_in=3600) → signed URL
   - delete_file(bucket, path)

6. backend/app/routers/datasets.py — dataset routes:
   - POST /api/v1/datasets — receive multipart file, upload to 'datasets' bucket at users/{user_id}/{dataset_id}/{filename}, create datasets table record, return dataset object
   - GET /api/v1/datasets — list user's datasets from DB
   - GET /api/v1/datasets/{id} — single dataset detail
   - DELETE /api/v1/datasets/{id} — delete dataset + file

7. backend/app/models/schemas.py — Pydantic models for all request/response shapes

8. backend/Procfile — web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
9. backend/requirements.txt — all Python deps from context.md

All routes require authentication via the auth middleware.
```

---

## PROMPT 6 — Schema Detection Engine

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the automatic schema detection engine in the FastAPI backend.

Create the following:
1. backend/app/services/schema_detector.py — schema detection service:

   Function: detect_schema(file_bytes: bytes, file_type: str) → dict
   
   For CSV and Excel files (pandas):
   - Load file into DataFrame
   - For each column detect:
     • data_type: 'numeric', 'categorical', 'datetime', 'boolean', 'text'
     • null_percentage: % of null values
     • unique_count: number of unique values
     • sample_values: list of 3 non-null sample values
     • min/max for numeric columns
     • most_frequent for categorical columns
   
   Detection logic:
   - boolean: column has only 2 unique values (true/false, yes/no, 0/1, 1/0)
   - datetime: pd.to_datetime() succeeds on >80% of values
   - numeric: dtype is int or float
   - categorical: object dtype AND unique_count < 50 OR unique_count/total < 0.05
   - text: object dtype with high cardinality
   
   Returns dict:
   {
     "row_count": int,
     "column_count": int,
     "columns": [
       {
         "name": str,
         "data_type": str,
         "null_percentage": float,
         "unique_count": int,
         "sample_values": list,
         "stats": dict  // min, max, mean for numeric; top_values for categorical
       }
     ]
   }

2. For JSON files: normalize with pd.json_normalize() then apply same detection
3. For Parquet files: pd.read_parquet() then same detection

4. Update backend/app/routers/datasets.py POST endpoint to:
   - After upload, run detect_schema()
   - Save schema JSON to datasets table
   - Update row_count and column_count
   - Return full schema in response

5. backend/app/services/schema_detector.py must handle errors gracefully (corrupted files, empty files, unsupported formats)
```

---

## PROMPT 7 — Modal.com ML Pipeline Setup

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Set up the Modal.com ML pipeline as an always-on serverless GPU service.

Create the following:
1. modal_ml/main.py — Modal app entry point:

   ```python
   import modal
   
   app = modal.App("syntho-ml")
   
   # Define the container image with all ML dependencies
   ml_image = (
       modal.Image.debian_slim(python_version="3.11")
       .pip_install([
           "sdv==1.9.0", "ctgan==0.7.5", "scikit-learn", "scipy",
           "presidio-analyzer", "presidio-anonymizer", "ydata-profiling",
           "matplotlib", "seaborn", "reportlab", "supabase",
           "pandas", "pyarrow", "fastapi"
       ])
       .run_commands(["python -m spacy download en_core_web_lg"])  # for Presidio
   )
   
   # Web endpoint — FastAPI app exposed publicly
   @app.function(image=ml_image, gpu="T4", timeout=3600, secrets=[modal.Secret.from_name("syntho-secrets")])
   @modal.web_endpoint(method="POST")
   async def run_job(payload: dict):
       # Validate shared secret
       # Dispatch to correct generator based on payload['method']
       # Run async in background (return 200 immediately, update Supabase for progress)
       pass
   
   @app.function(image=ml_image, gpu="T4", timeout=3600, secrets=[modal.Secret.from_name("syntho-secrets")])
   async def generate_synthetic(payload: dict):
       # Main job runner — called from run_job as background task
       pass
   ```

2. modal_ml/utils.py — shared utilities:
   - supabase_client() → Supabase client using env secrets
   - update_job_progress(synthetic_dataset_id, progress, status, message)
   - download_from_storage(bucket, path) → bytes
   - upload_to_storage(bucket, path, file_bytes, content_type)
   - log_job_event(synthetic_dataset_id, event, message)

3. modal_ml/main.py — complete run_job web endpoint:
   - Validate MODAL_API_SECRET header (shared secret with FastAPI backend)
   - Receive payload: {synthetic_dataset_id, original_file_path, method, config, user_id}
   - Spawn background Modal function: generate_synthetic.spawn(payload)
   - Return 200 immediately: {"status": "accepted", "job_id": call_id}
   
   generate_synthetic function:
   - Update status to 'running', progress to 5%
   - Download original file from Supabase Storage
   - Load into pandas DataFrame
   - Dispatch: if method == 'ctgan' → ctgan_generator, elif 'gaussian_copula' → sdv_generator
   - After generation: run privacy_scorer, correlation_validator, quality_reporter, compliance_reporter
   - Update status to 'completed', progress to 100%
   - On any exception: update status to 'failed', log error

4. Deploy Modal app:
   - modal_ml/.env — SUPABASE_URL, SUPABASE_SERVICE_KEY, MODAL_API_SECRET
   - Deploy command: `modal deploy modal_ml/main.py`
   - Modal gives permanent URL: `https://your-username--syntho-ml-run-job.modal.run`
   - Copy this URL → MODAL_API_URL in backend .env

5. backend/app/services/modal_client.py — Modal trigger service:
   Function: trigger_modal_job(job_payload: dict) → str (job_id)
   - POST to MODAL_API_URL
   - Header: X-API-Secret: MODAL_API_SECRET
   - Returns job_id from Modal response
   - Handles connection errors, timeouts gracefully

6. backend/app/routers/generate.py:
   - POST /api/v1/generate — body: {dataset_id, method, config}
   - Creates synthetic_datasets record (status: pending)
   - Calls modal_client.trigger_modal_job()
   - Saves returned job_id to synthetic_datasets.job_id
   - Returns synthetic_dataset object
```

---

## PROMPT 8 — Statistical Mimicry Generation (SDV)

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the SDV Gaussian Copula statistical mimicry generator in the Modal ML pipeline.

Create the following:
1. modal_ml/sdv_generator.py — SDV generation module:

   Function: generate_gaussian_copula(df: pd.DataFrame, config: dict, synthetic_dataset_id: str) → pd.DataFrame

   Steps:
   a. Build SDV metadata from the dataset schema (detect primary keys, column types)
   b. Initialize GaussianCopulaSynthesizer with config params:
      - num_rows: config.get('num_rows', len(df))
      - enforce_min_max: True
      - enforce_rounding: True
   c. Update progress to 10% in Supabase via utils.update_job_progress()
   d. synthesizer.fit(df) — update progress to 60%
   e. synthetic_data = synthesizer.sample(num_rows) — update progress to 80%
   f. Return synthetic DataFrame

   Config options supported:
   - num_rows: number of synthetic rows to generate
   - preserve_dtypes: bool (default True)

2. Update modal_ml/main.py generate_synthetic function:
   - Import sdv_generator
   - When method == 'gaussian_copula': call generate_gaussian_copula()
   - After generation, convert to CSV bytes
   - Upload to Supabase Storage at synthetic/{user_id}/{synthetic_dataset_id}/data.csv
   - Update synthetic_datasets table: status='running', file_path, row_count
   - Then immediately call privacy_scorer, correlation_validator, quality_reporter, compliance_reporter (imported from their modules)
   - Final update: status='completed', progress=100

3. app/(dashboard)/generate/[id]/page.tsx — generation config page:
   - Shows original dataset info (name, rows, columns, schema)
   - Method selector: "Statistical Mimicry (SDV)" | "GAN-based (CTGAN)"
   - Config form:
     • Number of rows to generate (default: same as original)
   - "Generate Now" button → POST /api/v1/generate
   - After submit: shows real-time progress bar via Supabase Realtime

4. hooks/useJobProgress.ts — Supabase Realtime hook:
   - Subscribes to synthetic_datasets table changes for a given id
   - Returns: {progress, status, error}
   - Auto-unsubscribes on unmount
```

---

## PROMPT 9 — GAN-Based Generation (CTGAN)

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the CTGAN GAN-based generation module in the Modal ML pipeline.

Create the following:
1. modal_ml/ctgan_generator.py — CTGAN generation module:

   Function: generate_ctgan(df: pd.DataFrame, config: dict, synthetic_dataset_id: str) → pd.DataFrame

   Steps:
   a. Identify discrete columns: columns where dtype is object or boolean, or numeric with < 20 unique values
   b. Initialize CTGANSynthesizer:
      - epochs: config.get('epochs', 300)
      - batch_size: config.get('batch_size', 500)
      - verbose: True
   c. Update progress to 5% via utils.update_job_progress()
   d. Subclass or wrap CTGANSynthesizer to emit progress every 10 epochs:
      - progress = 5 + (current_epoch / total_epochs) * 70
      - Call update_job_progress() in Supabase
   e. synthesizer.fit(df, discrete_columns)
   f. Update progress to 80%
   g. synthetic_data = synthesizer.sample(num_rows)
   h. Update progress to 90%
   i. Return synthetic DataFrame

   Config options:
   - num_rows: int (default same as original)
   - epochs: int (default 300)
   - batch_size: int (default 500)

2. Update modal_ml/main.py generate_synthetic function:
   - When method == 'ctgan': call ctgan_generator.generate_ctgan()
   - Modal's T4 GPU handles CTGAN in 5–15 minutes (vs 2–3 hours on CPU)
   - After generation: same pipeline as SDV (privacy → correlation → quality → compliance)

3. Update app/(dashboard)/generate/[id]/page.tsx:
   - When CTGAN is selected, show additional config:
     • Epochs slider (100–500, default 300)
     • Batch size input (default 500)
     • Info banner: "CTGAN uses GPU acceleration — typical job takes 5–15 minutes"
     (No scary warning needed — Modal's T4 GPU is fast)
   - Show estimated time based on epochs + dataset row count

4. Update components/shared/JobProgress.tsx to show:
   - Progress bar (0–100%)
   - Current step label: "Initializing" | "Training model" | "Generating data" | "Scoring privacy" | "Complete"
   - Elapsed time counter
   - Cancel button: PATCH /api/v1/generate/{id}/cancel
     (Sets status to 'failed' in DB — Modal checks this flag every epoch via Supabase)
   - On complete: show "View Results" button → /datasets/[synthetic_id]

5. Add to modal_ml/main.py — cancel check inside training loop:
   - Every 10 epochs, query synthetic_datasets table for current status
   - If status == 'failed' (cancelled by user): raise CancelledError to stop training cleanly
```

---

## PROMPT 10 — Privacy Risk Scorer

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the privacy risk scoring system using Presidio.

Create the following:
1. modal/privacy_scorer.py — privacy scoring module:

   Function: score_privacy(original_df: pd.DataFrame, synthetic_df: pd.DataFrame, synthetic_dataset_id: str) → dict

   Steps:
   a. PII Detection (Presidio):
      - Initialize AnalyzerEngine
      - For each text/categorical column in synthetic_df, sample 50 rows
      - Run analyzer.analyze() to detect: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, CREDIT_CARD, US_SSN, LOCATION, DATE_TIME, IP_ADDRESS, URL, NRP
      - Flag columns where PII is detected in >10% of samples
   
   b. Singling Out Risk:
      - For each column combination (up to 3-way), calculate uniqueness ratio in synthetic vs original
      - High risk if synthetic row uniqueness > 0.15 (15% of rows are unique on 3 columns)
   
   c. Linkability Risk:
      - Check if synthetic rows can be linked back to original using quasi-identifiers
      - Score = overlap % between synthetic and original on key column combinations
   
   d. Overall Score Calculation (0–100, higher = safer):
      - PII penalty: -20 per flagged column (max -60)
      - Singling out penalty: -20 if high risk
      - Linkability penalty: -20 if overlap > 5%
      - Start at 100, subtract penalties
   
   e. Risk Level:
      - 80–100: low (green)
      - 60–79: medium (yellow)
      - 40–59: high (orange)
      - 0–39: critical (red)

   f. Save to privacy_scores table via Supabase
   g. Return: {overall_score, risk_level, pii_detected, details}

2. components/reports/PrivacyScore.tsx — privacy score display component:
   - Large circular score gauge (using Recharts RadialBarChart)
   - Color coded by risk level
   - List of detected PII columns with type badges
   - Risk breakdown: Singling Out, Linkability, PII Risk
   - "Download Privacy Report" button

3. app/(dashboard)/datasets/[id]/page.tsx — dataset detail page:
   - Tabs: Overview | Privacy Score | Quality Report | Compliance Report | Download
   - Show PrivacyScore component in Privacy Score tab
   - Fetch data from Supabase privacy_scores table
```

---

## PROMPT 11 — GDPR + HIPAA Compliance PDF Report

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the automated GDPR and HIPAA compliance report generator.

Create the following:
1. modal/compliance_reporter.py — compliance report generator:

   Function: generate_compliance_report(original_df, synthetic_df, privacy_score_result, synthetic_dataset_id, report_type='combined') → bytes (PDF)

   GDPR Checks:
   - ✅/❌ No direct identifiers (names, emails, IDs) in synthetic data
   - ✅/❌ No quasi-identifiers that allow re-identification (privacy score > 60)
   - ✅/❌ Data minimization: synthetic columns limited to what's needed
   - ✅/❌ No special category data without explicit flag (health, religion, political)
   - ✅/❌ Synthetic data cannot be traced back to individuals
   
   HIPAA Checks (if health data detected):
   - ✅/❌ No PHI: names, addresses, dates (except year), phone/fax, email, SSN, MRN, health plan #, account #, certificate #, VIN, device ID, URL, IP, biometric, photos, unique identifiers
   - ✅/❌ Expert determination or safe harbor method applied
   - ✅/❌ De-identification verified (privacy score > 70 for HIPAA)

   PDF Structure (ReportLab):
   - Cover page: Syntho logo, report title, dataset name, generated date
   - Executive Summary: overall pass/fail, score
   - GDPR Compliance section: each check with ✅ or ❌ and explanation
   - HIPAA Compliance section: same
   - Risk Findings: list of issues found
   - Recommendations: what to fix if any checks failed
   - Footer: "Generated by Syntho — For informational purposes only"
   
   Style: professional, clean, Syntho brand colors (indigo headers)

2. Upload PDF to Supabase Storage: reports/{synthetic_dataset_id}/compliance.pdf
3. Save path and results to compliance_reports table

4. components/reports/ComplianceReport.tsx — compliance display:
   - Pass/Fail banner (green/red)
   - GDPR checklist with icons
   - HIPAA checklist with icons
   - "Download Full PDF Report" button → fetches signed URL from backend
   - Show in /datasets/[id] page Compliance tab

5. backend/app/routers/reports.py:
   - GET /api/v1/reports/compliance/{synthetic_dataset_id} → return compliance report data + signed PDF URL
```

---

## PROMPT 12 — Correlation Preservation Validator

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the feature correlation preservation validator.

Create the following:
1. modal/correlation_validator.py — correlation validation module:

   Function: validate_correlations(original_df: pd.DataFrame, synthetic_df: pd.DataFrame, synthetic_dataset_id: str) → dict

   Steps:
   a. Select numeric columns only (for correlation matrix)
   b. Compute Pearson correlation matrix for original_df
   c. Compute Pearson correlation matrix for synthetic_df
   d. Compute absolute difference matrix: |corr_original - corr_synthetic|
   e. Column-pair scores:
      - For each pair, score = 1 - abs_difference (0–1)
      - Flag pairs where difference > 0.15 as "degraded"
   
   f. For categorical columns:
      - Compute Cramér's V association for each categorical pair
      - Compare original vs synthetic
   
   g. Distribution similarity per column:
      - Numeric: KS test (scipy.stats.ks_2samp) → p-value and statistic
      - Categorical: Chi-squared test on value frequencies
      - Flag columns where KS statistic > 0.1 as "distribution drift"
   
   h. Overall correlation_score: mean of all column-pair scores × 100
   i. Overall distribution_score: % of columns passing KS test × 100
   j. Pass criteria: correlation_score > 75 AND distribution_score > 80
   
   k. Save to quality_reports table:
      {correlation_score, distribution_score, overall_score, column_stats, passed}

2. components/charts/CorrelationHeatmap.tsx:
   - Recharts heatmap (use ScatterChart trick or custom SVG grid)
   - Shows original vs synthetic correlation side by side
   - Color scale: deep blue (strong negative) → white (0) → deep red (strong positive)
   - Hover tooltip showing exact correlation value

3. components/reports/QualityReport.tsx:
   - Overall score badge
   - Correlation score + heatmap
   - Per-column distribution pass/fail list
   - "Passed" green banner or "Needs Improvement" orange banner
```

---

## PROMPT 13 — Data Quality Comparison Report

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the visual data quality comparison report (synthetic vs original side by side).

Create the following:
1. modal/quality_reporter.py — quality stats generator:

   Function: generate_quality_stats(original_df: pd.DataFrame, synthetic_df: pd.DataFrame) → dict

   For each column, compute and return:
   - original_stats: {mean, median, std, min, max, null_pct, top_values} 
   - synthetic_stats: same structure
   - distribution_data: binned frequency data for chart (20 bins for numeric, top 10 categories for categorical)
   - drift_score: how much synthetic drifts from original (0–1)

   Returns: { columns: [...], overall_fidelity_score: float }

2. components/charts/DistributionChart.tsx — per-column comparison chart:
   - Side-by-side bar charts using Recharts ComposedChart
   - Original bars in indigo, Synthetic bars in cyan
   - For numeric: histogram bins
   - For categorical: top 10 value frequencies
   - Legend, axis labels, tooltip

3. app/(dashboard)/datasets/[id]/page.tsx Quality Report tab:
   Build full quality comparison UI:
   
   a. Summary section:
      - Fidelity score (large number, color coded)
      - Correlation score from quality_reports
      - Row count comparison (original vs synthetic)
      - Column count confirmation
   
   b. Column-by-column comparison:
      - For each column: show DistributionChart
      - Below chart: stats table with original vs synthetic values side by side
      - Drift indicator badge: Low Drift (green) / Medium Drift (yellow) / High Drift (red)
   
   c. Statistical summary table:
      - All columns in rows
      - Columns: Column Name | Type | Original Mean | Synthetic Mean | Original Std | Synthetic Std | Drift Score
   
   d. Export button: "Download Quality Report CSV"
```

---

## PROMPT 14 — Realtime Job Tracking UI

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the complete real-time job progress tracking UI using Supabase Realtime.

Create the following:
1. hooks/useJobProgress.ts — Supabase Realtime hook:
   - Subscribe to synthetic_datasets table for a specific id
   - Uses supabase.channel().on('postgres_changes', ...) 
   - Returns: { progress: number, status: string, syntheticDataset: object, error: string | null }
   - Auto-unsubscribes when component unmounts
   - Polls every 5 seconds as fallback if Realtime fails

2. components/shared/JobProgress.tsx — enhanced progress component:
   - Animated progress bar (CSS transition)
   - Step indicators showing current pipeline stage:
     1. Uploading ✅
     2. Detecting Schema ✅  
     3. Training Model (with spinner if active)
     4. Generating Data
     5. Scoring Privacy
     6. Validating Correlations
     7. Generating Reports
     8. Complete 🎉
   - Estimated time remaining (calculated from progress rate)
   - Elapsed time counter
   - Log messages panel (expandable) — shows job_logs entries
   - Cancel button: PATCH /api/v1/generate/{id}/cancel
   - On complete: show "View Results" button → /datasets/[id]

3. app/(dashboard)/generate/[id]/page.tsx — update to show JobProgress after job starts:
   - Pre-generation: show config form
   - Post-submission: replace form with full-screen JobProgress component
   - On completion: auto-redirect to /datasets/[synthetic_id] after 3 second countdown

4. backend/app/routers/generate.py additions:
   - PATCH /api/v1/generate/{id}/cancel — sets status to 'failed', Modal checks this flag every iteration
   - GET /api/v1/generate/{id}/status — returns current job status (fallback for polling)

5. Notification on complete: use Sonner toast with "Your synthetic dataset is ready!" + link to view
```

---

## PROMPT 15 — Marketplace: Browse + Search

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the marketplace browsing and search experience.

Create the following:
1. app/(dashboard)/marketplace/page.tsx — marketplace browse page:
   - Header: "Syntho Marketplace" + subtitle
   - Search bar (debounced, 300ms)
   - Filter sidebar:
     • Category (Health, Finance, Retail, E-commerce, Social, Other)
     • Price range slider (₦0 – ₦500,000)
     • Generation method badge filter (CTGAN, SDV)
     • Privacy score filter (Low Risk only toggle)
   - Sort options: Newest | Most Downloaded | Lowest Price | Highest Privacy Score
   - Dataset grid (3 columns desktop, 2 tablet, 1 mobile)
   - Pagination (12 per page)

2. components/marketplace/ListingCard.tsx — marketplace dataset card:
   - Dataset name + category badge
   - Privacy score badge (color coded by risk level)
   - Generation method badge (CTGAN or SDV)
   - Row count + column count
   - Column type breakdown (mini bar: X numeric, Y categorical)
   - Price in Naira (₦)
   - Download count
   - Seller name + avatar
   - "Preview Schema" button → opens modal with column names and types
   - "Purchase" button

3. app/(dashboard)/marketplace/[id]/page.tsx — listing detail page:
   - Full listing info
   - Schema preview table (full columns, types, no actual data)
   - Seller info card
   - Privacy score display (read-only)
   - Quality score display
   - Sample distributions (blurred/redacted for non-purchasers)
   - Purchase card (price, one-click buy button)
   - Similar listings section

4. backend/app/routers/marketplace.py:
   - GET /api/v1/marketplace — list active listings with filters/search/sort/pagination
   - GET /api/v1/marketplace/{id} — single listing detail
   - Query builder using Supabase's filter, order, range
```

---

## PROMPT 16 — Marketplace: Seller Side

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the seller-side marketplace features for listing and managing datasets.

Create the following:
1. app/(dashboard)/sell/page.tsx — list a dataset for sale:
   - Step 1: Select which synthetic dataset to sell (dropdown of user's completed synthetic datasets)
   - Step 2: Listing details form:
     • Title (required)
     • Description (rich textarea, max 500 chars)
     • Category selector (Health, Finance, Retail, E-commerce, Social, Other)
     • Tags input (comma separated, max 5)
     • Price in Naira ₦ (min ₦100)
   - Step 3: Preview — shows how listing card will look
   - Submit button → POST /api/v1/marketplace/listings
   - Validation with React Hook Form + Zod

2. app/(dashboard)/sell/manage/page.tsx — manage your listings:
   - Table of all listings: Title | Category | Price | Downloads | Revenue | Status | Actions
   - Toggle active/inactive per listing
   - Edit listing button → opens edit modal
   - Delete listing (with confirmation dialog)
   - Total revenue card at top

3. components/marketplace/SellerDashboard.tsx — revenue summary:
   - Total revenue (all time)
   - Revenue this month
   - Total downloads
   - Best selling dataset

4. backend/app/routers/marketplace.py additions:
   - POST /api/v1/marketplace/listings — create listing (validates synthetic dataset belongs to user and is completed)
   - PATCH /api/v1/marketplace/listings/{id} — update listing
   - DELETE /api/v1/marketplace/listings/{id} — delete listing
   - GET /api/v1/marketplace/my-listings — seller's listings with revenue stats
   - PATCH /api/v1/marketplace/listings/{id}/toggle — activate/deactivate
```

---

## PROMPT 17 — Flutterwave Checkout

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the complete Flutterwave payment integration for marketplace purchases.

Create the following:
1. components/marketplace/CheckoutModal.tsx — purchase modal:
   - Shows: dataset name, price in ₦, seller name
   - "Pay with Flutterwave" button
   - Uses flutterwave-react-v3 useFlutterwave hook:
     • public_key: NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
     • tx_ref: generate unique ref: `SYNTHO-${userId}-${listingId}-${Date.now()}`
     • amount: listing.price
     • currency: 'NGN'
     • customer: { email, name } from user profile
     • customizations: { title: 'Syntho Marketplace', logo: '/logo.png' }
   - On payment success: POST /api/v1/purchases/verify with tx_ref
   - On payment failure: show error toast
   - On success verified: show success screen + "Download Dataset" button

2. lib/flutterwave.ts — frontend utility:
   - generateTxRef(userId, listingId) → unique tx ref string

3. backend/app/services/flutterwave.py — payment service:
   - verify_payment(tx_ref: str) → {status, amount, currency, customer}
   - Uses Flutterwave API: GET https://api.flutterwave.com/v3/transactions/verify_by_reference
   - Headers: Authorization: Bearer FLUTTERWAVE_SECRET_KEY

4. backend/app/routers/marketplace.py additions:
   - POST /api/v1/purchases/verify:
     • Receive tx_ref
     • Call flutterwave.verify_payment()
     • If valid: create purchases record (status: completed), grant buyer access
     • Return signed download URL for the synthetic dataset
   
   - GET /api/v1/purchases/my-purchases — list user's purchased datasets with download links
   - GET /api/v1/purchases/download/{listing_id} — get fresh signed URL (checks purchase exists)

5. app/api/webhooks/flutterwave/route.ts — Next.js webhook handler:
   - Verify webhook hash header matches FLUTTERWAVE_WEBHOOK_HASH
   - On successful payment event: POST to FastAPI /api/v1/webhooks/flutterwave
   - Idempotent: skip if purchase already recorded

6. app/(dashboard)/billing/page.tsx — purchases history:
   - Table: Dataset | Date | Amount | Status | Download
   - Total spent stat
```

---

## PROMPT 18 — Marketplace Split Payments

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build seller payout and revenue tracking using Flutterwave subaccounts.

Create the following:
1. Flutterwave Subaccount Setup:
   - backend/app/services/flutterwave.py additions:
     • create_subaccount(bank_name, account_number, business_name, user_id) → subaccount_id
       Uses: POST https://api.flutterwave.com/v3/subaccounts
     • list_banks(country='NG') → list of banks for selector

2. app/(dashboard)/billing/payout-setup/page.tsx — seller bank account setup:
   - Bank selector dropdown (fetches from Flutterwave bank list API)
   - Account number input
   - Account name (auto-verified via Flutterwave account resolution)
   - Business name input
   - Submit → creates Flutterwave subaccount, saves subaccount_id to profiles table
   - Show verified account name before final submit

3. Update purchase flow (backend/app/services/flutterwave.py):
   - When creating checkout, if seller has subaccount_id, add split config:
     {
       "subaccounts": [{
         "id": seller_subaccount_id,
         "transaction_charge_type": "percentage",
         "transaction_charge": 80  // seller gets 80%, Syntho keeps 20%
       }]
     }
   - Syntho's 20% platform fee goes to main Flutterwave account

4. Add to profiles table:
   - flutterwave_subaccount_id TEXT
   - bank_account_verified BOOLEAN DEFAULT FALSE

5. app/(dashboard)/billing/page.tsx — update seller view:
   - Revenue earned section:
     • Total earned (all time)
     • Pending (transactions not yet settled)
     • This month's earnings
   - Payout setup status: "Set up payout" button if not configured
   - Transaction history table with buyer (anonymized), amount, date, Syntho fee deducted, net payout

6. backend/app/routers/marketplace.py:
   - GET /api/v1/seller/revenue — aggregated revenue stats from purchases table
```

---

## PROMPT 19 — API Key Management

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the API key management system for teams to integrate Syntho into ML pipelines.

Create the following:
1. app/(dashboard)/api-keys/page.tsx — API keys management page:
   - "Create New API Key" button → opens modal
   - Modal: key name input, scope checkboxes (generate, read, marketplace)
   - On create: show full key ONCE in modal with copy button (never shown again)
   - Warning: "Save this key now — we won't show it again"
   - Keys table: Name | Prefix | Scopes | Usage | Last Used | Created | Actions
   - Revoke button per key (with confirmation)

2. backend/app/routers/api_keys.py:
   - POST /api/v1/api-keys — create key:
     • Generate cryptographically secure key: `sk_live_` + 48 random chars (secrets.token_urlsafe(36))
     • Store hash (hashlib.sha256) in DB, store prefix (first 8 chars) for display
     • Return FULL key once in response
   - GET /api/v1/api-keys — list user's keys (never return full key, only prefix + metadata)
   - DELETE /api/v1/api-keys/{id} — revoke key

3. backend/app/middleware/auth.py — add API key auth:
   - Check if Authorization header is `Bearer sk_live_*`
   - If API key format: hash it, look up in api_keys table, verify active + not expired
   - Increment usage_count, update last_used_at
   - Attach user_id to request state

4. app/(dashboard)/api-keys/page.tsx — also show API documentation section:
   - Base URL display
   - Quick start code examples in Python and JavaScript:

   Python example:
   ```python
   import requests
   
   API_KEY = "sk_live_your_key"
   BASE_URL = "https://your-render-app.onrender.com/api/v1"
   
   # Upload dataset
   # Generate synthetic data
   # Download results
   ```
   
   - Links to full docs page

5. backend: rate limiting on API key routes:
   - Track requests per minute per api_key in Redis
   - Return 429 with Retry-After header if exceeded (60 req/min default)
```

---

## PROMPT 20 — Public REST API + Rate Limiting

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the complete public REST API for ML pipeline integration.

Create the following:
1. backend/app/routers/public_api.py — external API routes (all require API key auth):

   Dataset Management:
   - POST /api/v1/ext/datasets — upload dataset (multipart)
   - GET /api/v1/ext/datasets — list datasets
   - GET /api/v1/ext/datasets/{id} — get dataset + schema

   Generation:
   - POST /api/v1/ext/generate — start generation job
     Body: { dataset_id, method, config: { num_rows, epochs } }
     Returns: { job_id, synthetic_dataset_id, status }
   - GET /api/v1/ext/generate/{synthetic_dataset_id}/status
     Returns: { status, progress, estimated_minutes_remaining }

   Results:
   - GET /api/v1/ext/results/{synthetic_dataset_id} — get all reports
     Returns: { privacy_score, quality_score, compliance_passed, download_url }
   - GET /api/v1/ext/results/{synthetic_dataset_id}/download — redirect to signed download URL

2. Rate limiting middleware (backend/app/middleware/rate_limit.py):
   - Redis-based sliding window counter per api_key
   - Limits: 60 requests/minute, 1000 requests/day
   - Returns headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
   - 429 response with JSON: { error: "Rate limit exceeded", retry_after: seconds }

3. app/(dashboard)/api-keys/docs/page.tsx — API documentation page:
   - Full endpoint reference with request/response examples
   - Code snippets in: Python | JavaScript | cURL
   - Authentication section explaining API key usage
   - Interactive "Try it" section for GET endpoints using user's own API key
   - Error codes reference

4. Standardized API response format for all ext routes:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": { "request_id": "uuid", "timestamp": "iso8601" }
   }
   // Error format:
   {
     "success": false,
     "error": { "code": "DATASET_NOT_FOUND", "message": "..." }
   }
   ```
```

---

## PROMPT 21 — User Dashboard + Analytics

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the complete user dashboard with usage analytics and dataset management.

Create the following:
1. app/(dashboard)/dashboard/page.tsx — rebuild with full analytics:
   
   Stats row (4 cards):
   - Datasets Uploaded (total)
   - Synthetic Datasets Generated (total)
   - API Calls This Month (from api_keys usage)
   - Revenue Earned (if seller, from purchases)
   
   Charts section:
   - Recharts LineChart: Generations per day (last 30 days)
   - Recharts BarChart: Generation method breakdown (CTGAN vs SDV)
   - Recharts PieChart: Dataset categories (if marketplace seller)
   
   Recent Activity feed:
   - Latest 10 events: uploads, generations completed, purchases, API calls
   
   Storage usage:
   - Progress bar: Supabase storage used / 1GB free tier
   
   Quick Actions:
   - Upload New Dataset
   - View Marketplace
   - Generate from existing dataset

2. app/(dashboard)/datasets/page.tsx — My Datasets page:
   - Tabs: Originals | Synthetic
   - Table with: Name | Size | Rows | Columns | Status | Created | Actions
   - Actions per row: Generate → /generate/[id], View Reports, Download, Delete
   - Search + filter by status
   - Sort by date, size, name
   - Empty state with upload CTA

3. components/datasets/DatasetTable.tsx — reusable dataset table component

4. app/(dashboard)/datasets/[id]/page.tsx — update the dataset detail page:
   - Full detail with all 5 tabs: Overview | Privacy Score | Quality Report | Compliance Report | Download
   - Overview tab: original dataset info + list of all synthetic versions generated from it
   - Each synthetic version shows: method, rows, date, scores, status badge
   - Download tab: signed URL download buttons for original + all synthetic versions + all PDFs
```

---

## PROMPT 22 — Admin Panel

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the admin panel for platform management.

Create the following:
1. middleware.ts — update to also check admin role for /admin routes:
   - If user.role !== 'admin': redirect to /dashboard

2. app/(dashboard)/admin/page.tsx — admin overview:
   Platform stats:
   - Total users (and new this week)
   - Total datasets uploaded
   - Total generations run
   - Total marketplace transactions + revenue (platform 20% cut)
   - Active API keys count
   - Storage used across all users

3. app/(dashboard)/admin/users/page.tsx — user management:
   - Table: Email | Name | Role | Datasets | API Keys | Joined | Actions
   - Actions: Promote to Admin, Suspend Account, View datasets
   - Search by email
   - Filter by role

4. app/(dashboard)/admin/marketplace/page.tsx — marketplace moderation:
   - All listings table: Title | Seller | Price | Downloads | Status | Created | Actions
   - Actions: Deactivate listing (with reason), View full listing
   - Filter by active/inactive, category
   - Flag system: users can report listings, admin sees flagged ones highlighted

5. app/(dashboard)/admin/jobs/page.tsx — job monitoring:
   - All generation jobs: User | Dataset | Method | Status | Progress | Started | Duration
   - Filter by status (running, failed, completed)
   - Failed jobs panel with error messages from job_logs
   - Re-trigger failed job button → calls backend

6. backend/app/routers/admin.py:
   - GET /api/v1/admin/stats
   - GET /api/v1/admin/users
   - PATCH /api/v1/admin/users/{id} — update role/status
   - GET /api/v1/admin/jobs
   - GET /api/v1/admin/marketplace
   - PATCH /api/v1/admin/marketplace/{id}/deactivate
   All routes check admin role from JWT.
```

---

## PROMPT 23 — Notifications + Email

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build the notification system using Supabase Edge Functions and email.

Create the following:
1. Add notifications table to Supabase:
   ```sql
   CREATE TABLE notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
     type TEXT, -- 'job_complete', 'purchase', 'sale', 'system'
     title TEXT,
     message TEXT,
     link TEXT,
     read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. supabase/functions/notify/index.ts — Supabase Edge Function:
   Called from backend after key events. Sends email via Supabase's built-in email OR Resend (free tier).
   
   Events to handle:
   - job_complete: "Your synthetic dataset '{name}' is ready!"
   - purchase_made: "You purchased '{listing_title}' for ₦{amount}"
   - sale_made: "Someone purchased your dataset '{title}' — ₦{net_amount} incoming"
   - job_failed: "Generation failed for '{name}' — please try again"
   
   For each: insert into notifications table + send email

3. backend: after each key event, call Supabase Edge Function:
   - After Modal reports job_complete: POST to edge function
   - After purchase verified: POST to edge function for both buyer and seller
   - After job_failed: POST to edge function

4. components/layout/Navbar.tsx — update notification bell:
   - Badge count: unread notifications
   - Dropdown panel: last 10 notifications (title, time ago, read/unread state)
   - "Mark all as read" button
   - Each notification is clickable (goes to link)
   - Realtime: subscribe to notifications table for new inserts

5. hooks/useNotifications.ts:
   - Fetch notifications from Supabase
   - Supabase Realtime subscription for new notifications
   - markAsRead(id), markAllAsRead()
   - Returns: { notifications, unreadCount, markAsRead, markAllAsRead }
```

---

## PROMPT 24 — Error Handling + Loading States

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Add comprehensive error handling, loading states, empty states, and polish throughout the app.

Create the following:
1. app/error.tsx — global Next.js error boundary:
   - Friendly error UI with Syntho branding
   - "Try again" button
   - "Go to Dashboard" link

2. app/not-found.tsx — 404 page:
   - Clean 404 design
   - "Go back home" button

3. components/shared/LoadingSpinner.tsx — reusable spinner variants: sm, md, lg
4. components/shared/EmptyState.tsx — empty state component:
   - Props: icon, title, description, actionLabel, onAction
   - Used in: datasets list (no datasets yet), marketplace (no results), api keys (no keys)

5. Add skeleton loaders for all data tables and cards:
   - components/shared/TableSkeleton.tsx
   - components/shared/CardSkeleton.tsx

6. Global error handling in lib/api.ts (Axios interceptor):
   - On 401: redirect to /login
   - On 429: show "Rate limit exceeded — try again in X seconds" toast
   - On 500+: show "Server error — please try again" toast
   - On network error: show "Connection error — check your internet" toast

7. React Query error handling:
   - Global onError handler in QueryClientProvider
   - Retry logic: 2 retries for 5xx errors, 0 retries for 4xx

8. Form validation error messages — ensure all forms show:
   - Inline field errors (red text below field)
   - Summary error toast on submit failure

9. Upload edge cases:
   - File too large (>100MB): immediate client-side rejection with size shown
   - Wrong file type: clear error message listing accepted formats
   - Upload timeout: retry button

10. Generation edge cases:
    - Modal unreachable: "ML service temporarily unavailable — try again in a few minutes"
    - Job stuck at same progress for 5+ minutes: "Job may be stuck" warning with cancel option
    - Modal GPU quota exceeded: graceful error message

11. Add loading states to all buttons (spinner inside button while submitting)
12. Confirm dialogs for all destructive actions (delete dataset, revoke API key, deactivate listing)
```

---

## PROMPT 25 — Deployment + Final Configuration

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Complete deployment setup for all services and final production configuration.

Create the following:
1. Frontend (Vercel):
   - vercel.json — configuration:
     • headers: security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
     • redirects: /api/* → block (API is on Render)
   - Update next.config.js:
     • images: domains for Supabase storage URL
     • security headers

2. Backend (Render):
   - backend/render.yaml — Render deployment config:
     • service type: web
     • build command: pip install -r requirements.txt
     • start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
     • environment variables list (all from context.md backend .env)
   - CORS update: lock to Vercel production URL only (no wildcard in production)

3. UptimeRobot Setup instructions file: UPTIME_SETUP.md
   - How to create free UptimeRobot account
   - Add HTTP monitor for Render URL /health endpoint
   - Set 5-minute ping interval
   - Alert email setup

4. Supabase production checklist: SUPABASE_PRODUCTION.md
   - Enable email confirmations
   - Set JWT expiry to 7 days
   - Add production redirect URLs for OAuth (Vercel URL)
   - Enable Supabase Realtime for: synthetic_datasets, notifications tables
   - Set storage bucket policies to production (no public write)
   - Run all migrations in order

5. Modal.com production notes: MODAL_SETUP.md
   - modal deploy command and how to get permanent URL
   - Setting MODAL_API_URL in Render environment variables
   - GPU selection: T4 for CTGAN (faster), CPU for Gaussian Copula (free)
   - Monitoring Modal job logs via modal.com dashboard
   - Handling Modal cold starts (first request ~10s delay)
   - Free credit usage tracking and alert setup


6. Environment variable validation on startup:
   - backend/app/config.py: validate all required env vars on startup, fail fast with clear message if missing

7. Final SEO + meta tags (app/layout.tsx):
   - title: "Syntho — Synthetic Data Marketplace"
   - description: "Generate safe synthetic data, score privacy risk, and monetize your datasets"
   - og:image, og:title, og:description
   - favicon

8. README.md — project setup guide for developers:
   - Prerequisites
   - Local development setup (step by step)
   - Environment variables setup
   - Supabase setup steps
   - Running frontend, backend, Modal
   - Deployment guide
```

---

## Tips for Maximum Prompt Efficiency

1. **Always paste context.md + security.md first** — saves 3-5 back-and-forth clarification messages per prompt and ensures every file Claude writes is secure by default
2. **Update the progress tracker** in your context.md after each prompt completes (change ⬜ to ✅)
3. **If a prompt produces too much code** — split it: do the backend half first, then the frontend half
4. **If Claude loses context mid-prompt** — paste both context.md and security.md again and say "Continue from where you left off on Prompt X"
5. **Test each module before moving to next** — catch bugs early before they compound
6. **Modal prompts (7-9)** — after Prompt 7, run `modal deploy main.py` and paste the output URL back to Claude to confirm the endpoint URL before continuing to Prompts 8 and 9
7. **Security review** — after every prompt that touches auth, payments, or file handling, re-read the relevant security.md section and verify Claude followed it
8. **Never skip the security checklist** in security.md before going live — run through it line by line on the deployed app

---

## APPENDIX — Prompt Usage Checklist

Before pasting any prompt into a new Claude session:

- [ ] Paste `context.md` in full
- [ ] Paste `security.md` in full
- [ ] Paste `design.md` in full
- [ ] State which prompt number you are working on
- [ ] Mark previous prompt complete in context.md Build Progress Tracker
- [ ] Have your `.env` values ready to test immediately after

**Tip:** When Claude writes a file, test it before moving to the next prompt. If something breaks, keep Claude in the same session (context is preserved) and ask it to fix the error. Only start a new session for a new prompt number.

---

## APPENDIX — Common Fixes

**"Cannot find module X"**
→ Run `npm install` in frontend/ or `pip install -r requirements.txt` in backend/

**"Supabase client not found"**
→ Check NEXT_PUBLIC_SUPABASE_URL is in .env.local and server was restarted

**"Modal job not starting"**
→ Check MODAL_API_URL is correct (copy exact URL from `modal deploy` output)
→ Check MODAL_API_SECRET matches in both Render env vars and Modal secrets

**"Flutterwave webhook not firing"**
→ Check webhook URL includes /api/webhooks/flutterwave
→ Check webhook hash matches FLUTTERWAVE_WEBHOOK_HASH

**"File upload failing"**
→ Check Supabase Storage bucket policies (see security.md)
→ Check file size < 100MB

**"Privacy score not computed"**
→ Check Modal job logs — Presidio language model may need to be downloaded first run
→ This is normal on first deployment — cold start downloads NLP models

---

## PROMPT 26 — Groq AI Agent Layer

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Integrate Groq LLM (llama-3.3-70b-versatile) as an AI agent layer in the FastAPI backend.
This adds 5 intelligent features triggered automatically after pipeline stages complete.

Add GROQ_API_KEY to backend .env and backend/app/config.py validation.

Install: pip install groq

Create the following:

1. backend/app/lib/groq_client.py — Groq client singleton:
   - Initialize Groq(api_key=settings.GROQ_API_KEY)
   - Wrapper: async def ask_groq(system: str, user: str, max_tokens: int = 500) → str
   - Model: "llama-3.3-70b-versatile"
   - Temperature: 0.3 (factual, consistent)
   - Always wrap in try/except — if Groq fails, return None (never block the pipeline)

2. backend/app/services/ai_advisor.py — 5 AI feature functions:

   a. analyze_schema(dataset_schema: dict, sample_rows: list) → dict
      Called: after dataset upload completes (datasets table status → 'ready')
      System prompt: "You are a synthetic data expert. Given a dataset schema and sample rows,
      recommend the best generation method and config. Return ONLY JSON."
      User prompt: f"Schema: {schema_json}\nSample (5 rows): {sample_json}\n
      Return JSON: {{method: 'ctgan'|'tvae'|'gaussian_copula', epochs: int, batch_size: int,
      reason: str (max 2 sentences)}}"
      Save result to datasets.schema JSONB field under key 'ai_recommendation'

   b. explain_compliance(report_findings: list, passed: bool) → str
      Called: after compliance_reports row is inserted
      System prompt: "You are a GDPR and HIPAA compliance expert. Explain findings in plain English
      for a non-technical user. Be concise and actionable."
      User prompt: f"Passed: {passed}\nFindings: {findings_json}\n
      Write 3-5 sentences explaining what passed, what failed, and what the user should do."
      Save to compliance_reports.findings JSONB under key 'ai_explanation'

   c. write_listing_copy(dataset_name: str, schema: dict, row_count: int,
                         privacy_score: float, category: str) → dict
      Called: when user clicks "List on Marketplace" (before listing form loads)
      System prompt: "You are a data marketplace copywriter. Write compelling, accurate listing copy."
      User prompt: f"Dataset: {name}\nColumns: {column_names}\nRows: {row_count}\n
      Privacy score: {privacy_score}/100\nCategory: {category}\n
      Return ONLY JSON: {{title: str (max 80 chars), description: str (max 300 chars),
      tags: list[str] (5 tags)}}"
      Return JSON to frontend to pre-fill the listing form

   d. advise_quality(quality_report: dict, generation_method: str) → str
      Called: after quality_reports row is inserted and overall_score < 70
      System prompt: "You are a synthetic data quality expert. Give specific, actionable advice."
      User prompt: f"Generation method: {generation_method}\nQuality scores: {scores_json}\n
      Overall: {overall_score}/100\nWrite 2-4 bullet points on exactly how to improve quality."
      Save to quality_reports.column_stats JSONB under key 'ai_advice'

   e. search_listings(query: str, available_listings: list) → list[str]
      Called: when user types in marketplace search bar (debounced 500ms)
      System prompt: "You are a search engine for a synthetic data marketplace.
      Return matching listing IDs only."
      User prompt: f"Query: '{query}'\nListings: {listings_summary_json}\n
      Return ONLY a JSON array of listing IDs that best match the query. Max 20 results."
      Returns: list of listing UUIDs to filter frontend results

3. backend/app/routers/ai.py — AI endpoints:
   - POST /api/v1/ai/recommend-method/{dataset_id}
     Triggers analyze_schema, returns recommendation JSON
   - POST /api/v1/ai/explain-compliance/{report_id}
     Triggers explain_compliance, returns explanation string
   - POST /api/v1/ai/listing-copy — body: {synthetic_dataset_id}
     Triggers write_listing_copy, returns {title, description, tags}
   - POST /api/v1/ai/quality-advice/{quality_report_id}
     Triggers advise_quality if score < 70, returns advice string
   - GET /api/v1/ai/search?q={query}
     Triggers search_listings, returns filtered listing IDs

   All endpoints: require auth header, rate limit 20 req/min per user

4. Frontend integration:
   a. app/(dashboard)/datasets/[id]/page.tsx — after upload completes:
      - Fetch AI recommendation from /api/v1/ai/recommend-method/{dataset_id}
      - Show "AI Recommends: CTGAN · 300 epochs · batch 500" chip with info tooltip
      - Pre-select this method in the Generate tab

   b. components/reports/ComplianceReport.tsx — below findings list:
      - Show AI plain-English explanation in an aurora glass card
      - Label: "AI Summary" with Groq logo badge (small)

   c. app/(dashboard)/marketplace/new/page.tsx — listing creation form:
      - On load, auto-call /api/v1/ai/listing-copy
      - Show "✨ AI-generated" badge on pre-filled fields
      - User can edit all AI-generated text freely

   d. components/reports/QualityReport.tsx — if overall_score < 70:
      - Show "AI Advice" expandable section below quality scores
      - Render bullet points from advise_quality response

   e. app/(dashboard)/marketplace/page.tsx — search bar:
      - Debounce 500ms then call /api/v1/ai/search?q=
      - Filter displayed listings to returned IDs
      - Show "AI Search" badge when AI results are active

5. Add GROQ_API_KEY to:
   - backend/.env.example
   - context.md environment variables section
   - deployment checklist
```

---

## PROMPT 27 — Full System Test + QA Suite

```
[PASTE CONTEXT.MD HERE]
[PASTE SECURITY.MD HERE]
[PASTE DESIGN.MD HERE]

Task: Build a comprehensive test suite that validates every major feature of Syntho against
the full project requirements. Tests must be runnable locally and in CI.

Install: pip install pytest pytest-asyncio httpx pytest-cov
         npm install --save-dev jest @testing-library/react @testing-library/jest-dom

Create the following:

─────────────────────────────────────────
BACKEND TESTS (pytest)
─────────────────────────────────────────

1. backend/tests/conftest.py:
   - Pytest fixtures: test Supabase client, mock Groq client, mock Modal stub
   - async_client fixture: httpx.AsyncClient pointed at FastAPI app
   - test user fixture: creates a test profile in Supabase (cleaned up after session)
   - test dataset fixture: uploads a small 100-row CSV (titanic subset) to Supabase storage

2. backend/tests/test_auth.py:
   - test_signup_creates_profile: verify trigger creates profiles row after auth signup
   - test_protected_route_without_token: expect 401 on all /api/v1/* routes
   - test_protected_route_with_valid_token: expect 200
   - test_invalid_token_rejected: tampered JWT returns 401
   - test_api_key_auth: valid sk_live_ key allows access; invalid key returns 401
   - test_api_key_rate_limit: 101 requests with same key returns 429

3. backend/tests/test_datasets.py:
   - test_upload_csv: upload titanic.csv, verify datasets row created with correct schema
   - test_upload_json: upload valid JSON, verify file_type detected correctly
   - test_upload_invalid_extension: .exe upload returns 400
   - test_upload_too_large: file >100MB returns 413
   - test_schema_detection: verify column types inferred correctly (numeric, categorical, datetime)
   - test_dataset_belongs_to_user: user A cannot access user B's dataset (403)

4. backend/tests/test_generation.py:
   - test_start_generation_gaussian_copula: triggers job, verify synthetic_datasets row created
     with status='pending', modal stub called with correct params
   - test_start_generation_ctgan: same for ctgan
   - test_cancel_generation: PATCH cancel endpoint sets status='failed'
   - test_generation_progress_updates: simulate Modal webhook updating progress 0→25→50→75→100
   - test_generation_completion: verify synthetic file saved to storage, status='completed'
   - test_generation_wrong_owner: user B cannot cancel user A's job (403)

5. backend/tests/test_privacy.py:
   - test_privacy_score_clean_data: synthetic data with no PII scores >= 80
   - test_privacy_score_pii_detected: synthetic data with email column scores < 60
   - test_risk_level_mapping: verify score→risk_level mapping (80+=low, 60-79=medium etc.)
   - test_singling_out_detection: highly unique synthetic rows trigger singling_out_risk
   - test_privacy_score_saved_to_db: verify privacy_scores row inserted with correct fields

6. backend/tests/test_compliance.py:
   - test_gdpr_pass: clean synthetic data passes all GDPR checks
   - test_gdpr_fail_pii: data with PERSON entities fails GDPR check
   - test_hipaa_pass: de-identified health data passes HIPAA (score > 70)
   - test_hipaa_fail_phi: data with dates+names fails HIPAA
   - test_pdf_generated: compliance_reports.file_path is set and file exists in Supabase storage
   - test_combined_report: report_type='combined' runs both GDPR and HIPAA checks

7. backend/tests/test_quality.py:
   - test_correlation_score: synthetic data from gaussian_copula scores >= 70 correlation
   - test_distribution_score: CTGAN-generated data has distribution_score >= 60
   - test_overall_score_calculation: verify weighted average formula
   - test_quality_report_saved: quality_reports row inserted after pipeline completes

8. backend/tests/test_marketplace.py:
   - test_create_listing: seller creates listing, verify is_approved=False initially
   - test_listing_not_visible_before_approval: unapproved listing absent from GET /marketplace
   - test_admin_approves_listing: admin PATCH sets is_approved=True, listing now visible
   - test_purchase_flow: buyer calls checkout endpoint, receives Flutterwave payment URL
   - test_flutterwave_webhook_success: valid webhook signature marks purchase as completed
   - test_flutterwave_webhook_invalid_sig: tampered signature returns 400
   - test_download_after_purchase: buyer can download synthetic file after completed purchase
   - test_download_without_purchase: buyer without purchase gets 403
   - test_split_payment: verify seller subaccount receives correct % of transaction

9. backend/tests/test_api_keys.py:
   - test_create_api_key: returns key with sk_live_ prefix, hash stored not plaintext
   - test_key_only_shown_once: re-fetch returns masked key (prefix + ***)
   - test_revoke_key: revoked key returns 401
   - test_key_scopes: key with only 'read' scope cannot POST /generate

10. backend/tests/test_groq_ai.py:
    - test_schema_recommendation_returns_valid_method: response contains method in ['ctgan','tvae','gaussian_copula']
    - test_compliance_explanation_is_string: returns non-empty string
    - test_listing_copy_json_structure: returns {title, description, tags}
    - test_groq_failure_does_not_break_pipeline: mock Groq to raise exception; verify pipeline still completes
    - test_search_returns_uuids: AI search returns list of valid UUID strings

─────────────────────────────────────────
FRONTEND TESTS (Jest + React Testing Library)
─────────────────────────────────────────

11. frontend/__tests__/components/UploadDropzone.test.tsx:
    - renders correctly (snapshot)
    - accepts CSV files without error
    - rejects non-CSV/JSON/parquet files with error message
    - rejects files over 100MB with size error
    - shows upload progress bar when uploading

12. frontend/__tests__/components/JobProgress.test.tsx:
    - renders pending state correctly
    - renders running state with progress bar at correct %
    - renders completed state with download button
    - renders failed state with error message and retry button
    - Realtime subscription updates progress without page reload

13. frontend/__tests__/components/PrivacyScore.test.tsx:
    - renders score gauge with correct color for each risk level
    - low risk (85) → green gauge
    - medium risk (65) → yellow gauge
    - high risk (45) → orange gauge
    - critical risk (25) → red gauge
    - PII detected list renders correct column names

14. frontend/__tests__/pages/marketplace.test.tsx:
    - renders listing cards with title, price, privacy score
    - search input filters listings
    - AI search badge appears when search is active
    - "Purchase" button visible for non-owned listings
    - "Download" button visible for purchased listings
    - "Edit" button visible only for own listings

15. frontend/__tests__/lib/api.test.ts:
    - 401 response redirects to /login
    - 429 response shows rate limit toast with retry-after seconds
    - 500 response shows server error toast
    - network error shows connection error toast

─────────────────────────────────────────
END-TO-END TEST (Playwright)
─────────────────────────────────────────

16. Install: npm install --save-dev @playwright/test
    Create e2e/full-flow.spec.ts — complete user journey:

    Step 1 — Auth:
    - Navigate to /login
    - Sign in with test credentials (env: E2E_TEST_EMAIL, E2E_TEST_PASSWORD)
    - Verify redirect to /dashboard

    Step 2 — Upload:
    - Navigate to /datasets/upload
    - Upload titanic.csv (100 rows, test fixture)
    - Verify success toast: "Dataset uploaded successfully"
    - Verify redirect to /datasets/{id}
    - Verify AI recommendation chip appears within 5s

    Step 3 — Generate:
    - Click "Generate Synthetic Data" tab
    - Verify AI-recommended method is pre-selected
    - Click "Start Generation"
    - Verify progress bar appears
    - Wait up to 10 minutes for status=completed (poll every 10s)
    - Verify "Download" button appears

    Step 4 — Reports:
    - Click "Privacy Score" tab
    - Verify score gauge renders with a numeric score
    - Click "Compliance Report" tab
    - Verify GDPR pass/fail badges render
    - Verify AI explanation text is present
    - Click "Quality Report" tab
    - Verify correlation score and distribution score render

    Step 5 — Marketplace:
    - Click "List on Marketplace"
    - Verify form is pre-filled with AI-generated title, description, tags
    - Submit listing form
    - Verify success: "Listing submitted for review"

    Step 6 — API Keys:
    - Navigate to /settings/api-keys
    - Click "Create API Key"
    - Enter name "Test Key"
    - Verify key shown once with sk_live_ prefix
    - Copy key, then refresh
    - Verify key is now masked

    Step 7 — Notifications:
    - Verify notification bell shows unread badge
    - Click bell, verify dropdown shows "Your synthetic dataset is ready" notification

─────────────────────────────────────────
TEST RUNNER CONFIG
─────────────────────────────────────────

17. backend/pytest.ini:
    - asyncio_mode = auto
    - testpaths = tests
    - Coverage: 80% minimum threshold

18. frontend/jest.config.ts:
    - testEnvironment: jsdom
    - setupFilesAfterFramework: @testing-library/jest-dom

19. .github/workflows/test.yml — CI pipeline:
    - Trigger: push to main, PR to main
    - Jobs: backend-tests (pytest --cov, fail if < 80%), frontend-tests (jest), e2e (playwright)
    - Upload coverage report as artifact

20. backend/tests/fixtures/titanic_100.csv — sample test CSV:
    - 100 rows, columns: PassengerId, Survived, Pclass, Name, Sex, Age, Fare, Embarked
    - Used across all dataset/generation/privacy/quality tests
```

---