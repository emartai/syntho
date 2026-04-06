# Syntho — Project Context
## Paste this + security.md + design.md at the start of every prompt session

---

## Project Overview

**Syntho** is a Synthetic Data SaaS. Companies use it to:
- Upload real datasets and generate statistically faithful synthetic versions
- Get a single composite Trust Score (0–100) combining privacy, fidelity, and compliance
- Download a GDPR + HIPAA compliance PDF — the headline deliverable
- Integrate generation into ML pipelines via REST API (Pro/Growth plans)

**Core value prop in one sentence:** Upload a real dataset → get a safe synthetic version + a compliance PDF in under 5 minutes.

**Design:** Plasma Aurora UI + Data Helix Logo (see design.md for full spec)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.11) on Render |
| Auth | Supabase Auth — Google + GitHub OAuth |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime — job progress + notifications |
| ML Engine | Modal.com — T4 GPU (CTGAN, SDV, Presidio) |
| PDF Reports | ReportLab (Python) |
| Payments | Flutterwave (subscription upgrades) |
| Frontend Deploy | Vercel |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios + TanStack React Query |

---

## Plans + Pricing

| Plan | Price | Jobs/month | Max rows/job | Methods | API Keys |
|------|-------|-----------|--------------|---------|----------|
| Free | ₦0 | 10 | 10,000 | Gaussian Copula only | No |
| Pro | ₦5,000/mo | Unlimited | 500,000 | CTGAN + Gaussian Copula | Yes |
| Growth | ₦15,000/mo | Unlimited | 5,000,000 | All methods | Yes + priority GPU |

Quota config constants (backend/app/config.py):
- FREE_JOBS_QUOTA = 10
- FREE_ROW_CAP = 10000
- PRO_ROW_CAP = 500000
- GROWTH_ROW_CAP = 5000000

---

## Composite Trust Score Formula

The single number shown to users after generation. Computed in Modal, saved to trust_scores table.

```
composite = (privacy_score × 0.40) + (fidelity_score × 0.40) + (compliance_score × 0.20)

fidelity_score      = quality_reports.overall_score
compliance_score    = 100 if passed else 50 (partial if one of gdpr/hipaa passes)
All inputs clamped 0–100. Final composite clamped 0–100.

Labels: 90–100 Excellent | 75–89 Good | 60–74 Fair | 0–59 Needs Improvement
```

**There are NO separate report tabs.** Privacy, quality, and compliance are sections on a single scrollable result page. The PDF is foregrounded as the primary download CTA.

---

## Folder Structure

```
syntho/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   ├── datasets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx        ← original dataset detail OR synthetic result
│   │   │   ├── generate/[id]/page.tsx   ← generation config + job progress
│   │   │   ├── api-keys/page.tsx        ← Launch feature (Pro/Growth)
│   │   │   └── settings/billing/page.tsx
│   │   ├── _components/                 ← landing page sections
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── SocialProofBar.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── FinalCTA.tsx
│   │   │   └── Footer.tsx
│   │   ├── api/webhooks/flutterwave/route.ts
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                          ← shadcn/ui primitives
│   │   ├── brand/Logo.tsx
│   │   ├── layout/
│   │   │   ├── AuroraBackground.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Navbar.tsx
│   │   ├── upload/
│   │   │   ├── Dropzone.tsx
│   │   │   └── SchemaPreview.tsx
│   │   ├── datasets/
│   │   │   └── DatasetTable.tsx
│   │   ├── reports/
│   │   │   └── TrustScore.tsx           ← composite score gauge (replaces 3 separate screens)
│   │   ├── charts/
│   │   │   ├── DistributionChart.tsx
│   │   │   └── CorrelationHeatmap.tsx
│   │   └── shared/
│   │       ├── JobProgress.tsx
│   │       ├── NotificationPanel.tsx    ← Launch feature
│   │       ├── UpgradeModal.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── CardSkeleton.tsx
│   │       └── TableSkeleton.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── api.ts
│   │   ├── flutterwave.ts
│   │   └/utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useJobProgress.ts
│   │   └── useNotifications.ts          ← Launch feature
│   ├── types/index.ts
│   ├── middleware.ts
│   ├── vercel.json
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── datasets.py
│   │   │   ├── generate.py
│   │   │   ├── reports.py
│   │   │   ├── api_keys.py              ← Launch feature
│   │   │   ├── notifications.py         ← Launch feature
│   │   │   ├── billing.py              ← Flutterwave subscription
│   │   │   └── webhooks.py
│   │   ├── services/
│   │   │   ├── supabase.py
│   │   │   ├── storage.py
│   │   │   ├── modal_client.py
│   │   │   ├── schema_detector.py
│   │   │   └── flutterwave.py
│   │   ├── middleware/auth.py           ← handles JWT + API key auth
│   │   ├── dependencies/
│   │   │   └── quota.py                ← freemium enforcement
│   │   └── models/schemas.py
│   ├── render.yaml
│   └── requirements.txt
│
├── modal_ml/
│   ├── main.py                          ← Modal app + web endpoint + generate_synthetic()
│   ├── ctgan_generator.py
│   ├── sdv_generator.py
│   ├── privacy_scorer.py
│   ├── correlation_validator.py
│   ├── quality_reporter.py
│   ├── compliance_reporter.py           ← generates GDPR/HIPAA PDF (headline feature)
│   └── utils.py                         ← update_job_progress, create_notification
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        ├── 002_rls_policies.sql
        ├── 003_storage_policies.sql
        ├── 004_freemium_quota.sql
        └── 005_indexes.sql
```

---

## Database Schema

```sql
-- User profiles (auto-created on signup)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','growth')),
  jobs_used_this_month INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Original uploaded datasets
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  row_count INTEGER,
  column_count INTEGER,
  schema JSONB,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploading','processing','ready','error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated synthetic datasets
CREATE TABLE synthetic_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  generation_method TEXT CHECK (generation_method IN ('ctgan','gaussian_copula')),
  file_path TEXT,
  row_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite trust scores (1 per synthetic dataset)
CREATE TABLE trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE UNIQUE,
  composite_score NUMERIC(5,2),
  privacy_score NUMERIC(5,2),
  fidelity_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy analysis
CREATE TABLE privacy_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2),
  pii_detected JSONB,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality + fidelity metrics
CREATE TABLE quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  correlation_score NUMERIC(5,2),
  distribution_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  column_stats JSONB,
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GDPR/HIPAA compliance results
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('gdpr','hipaa','combined')),
  file_path TEXT,
  passed BOOLEAN,
  gdpr_passed BOOLEAN,
  hipaa_passed BOOLEAN,
  findings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys (Pro/Growth plans only)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['generate','read'],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app notifications (Launch feature)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('job_complete','job_failed','quota_warning','quota_exhausted')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job event log
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  event TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ML Pipeline Flow

```
1. User uploads CSV/JSON/Parquet/Excel → FastAPI → Supabase Storage
2. FastAPI detects schema (pandas) → saves to datasets table
3. User selects generation method + num_rows on /generate/[id]
   - Free: Gaussian Copula only, max 10k rows
   - Pro/Growth: CTGAN available, no row cap
4. FastAPI checks quota → creates synthetic_datasets record (status: pending) → calls Modal
5. Modal (T4 GPU) runs generate_synthetic():
   a. Download original file from Supabase Storage
   b. CTGAN or Gaussian Copula generation
   c. Upload synthetic CSV to Supabase Storage
   d. Presidio PII detection → privacy_scorer → save privacy_scores
   e. Correlation + KS test → quality_reporter → save quality_reports
   f. GDPR/HIPAA checks → compliance_reporter → generate PDF → save compliance_reports
   g. Compute composite trust score → save trust_scores
   h. Create notification (job_complete or job_failed)
   i. Update synthetic_datasets: status='completed', progress=100
6. Supabase Realtime → frontend shows live progress
7. User sees composite trust score + downloads compliance PDF
```

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
NEXT_PUBLIC_SAMPLE_DATASET_PATH=datasets/sample/nigerian_retail_sample.csv
```

### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_WEBHOOK_HASH=your_flutterwave_webhook_hash
MODAL_API_URL=https://your-username--syntho-ml-run-job.modal.run
MODAL_API_SECRET=your_modal_shared_secret
FRONTEND_URL=https://syntho.vercel.app
ALLOWED_ORIGINS=https://syntho.vercel.app,https://syntho-henna.vercel.app
FREE_JOBS_QUOTA=10
FREE_ROW_CAP=10000
```

### Modal ML (modal secret: syntho-secrets)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
MODAL_API_SECRET=your_modal_shared_secret
```

---

## Dependencies

### Backend (requirements.txt)
```
fastapi==0.111.0
uvicorn==0.29.0
python-multipart==0.0.9
supabase==2.4.0
pandas==2.2.0
pyarrow==15.0.0
openpyxl==3.1.2
python-jose[cryptography]==3.3.0
httpx==0.27.0
reportlab==4.1.0
python-dotenv==1.0.0
pydantic==2.6.0
pydantic-settings==2.2.0
python-magic==0.4.27
python-magic-bin==0.4.14
```

### Modal ML (modal_ml/requirements.txt)
```
modal==0.62.0
sdv==1.9.0
ctgan==0.7.5
scikit-learn==1.4.0
scipy==1.12.0
presidio-analyzer==2.2.354
presidio-anonymizer==2.2.354
matplotlib==3.8.3
seaborn==0.13.2
reportlab==4.1.0
supabase==2.4.0
pandas==2.2.0
pyarrow==15.0.0
fastapi==0.111.0
```

### Frontend (package.json key deps)
```json
{
  "dependencies": {
    "next": "14.2.0",
    "typescript": "5.4.0",
    "tailwindcss": "3.4.1",
    "@supabase/supabase-js": "2.42.0",
    "@supabase/ssr": "0.3.0",
    "react-dropzone": "14.2.3",
    "@tanstack/react-query": "5.28.0",
    "recharts": "2.12.0",
    "react-hook-form": "7.51.0",
    "zod": "3.22.4",
    "axios": "1.6.8",
    "flutterwave-react-v3": "1.0.9",
    "lucide-react": "0.363.0",
    "date-fns": "3.6.0",
    "sonner": "1.4.41",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.2"
  }
}
```

---

## Naming Conventions

- Files: kebab-case (`dataset-table.tsx`, `privacy-scorer.py`)
- Components: PascalCase (`DatasetTable`, `TrustScore`)
- Functions: camelCase (`getDatasets`, `generateSynthetic`)
- DB tables: snake_case (`synthetic_datasets`, `trust_scores`)
- API routes: `/api/v1/datasets`, `/api/v1/generate`
- Storage buckets: `datasets` | `synthetic` | `reports`
- Storage paths: `{bucket}/{user_id}/{resource_id}/{filename}`
- API keys prefix: `sk_live_`

---

## Companion Files

- **security.md** — Auth patterns, input validation, secret management, rate limiting, payment verification
- **design.md** — Full Plasma Aurora + Data Helix design system. Colors, typography, components, animations
- **prompt.md** — All 20 build prompts for the Launch MVP
- **api-reference.md** — Complete API endpoint documentation
- **setup-guide.md** — Step-by-step local dev setup

---

## Key Rules for Claude

1. Always use **TypeScript** — no plain JS
2. Use **Supabase SSR client** in server components, browser client in client components
3. All API calls go through **`/lib/api.ts`** Axios instance with auth headers
4. All DB writes use **Supabase service role key** (backend only — never frontend)
5. File paths in DB are **Storage paths**, not full URLs
6. **Never expose** Supabase service key or any secret to frontend
7. Use **shadcn/ui** components before writing custom ones
8. All forms: **React Hook Form + Zod**
9. All async data: **TanStack React Query**
10. Supabase Realtime subscriptions in **custom hooks** (`/hooks/`)
11. Follow **security.md** for all auth, file upload, payment, DB code
12. Follow **design.md** for all UI — Clash Display headings, Satoshi body, JetBrains Mono code, aurora palette
13. Storage paths: `{bucket}/{user_id}/{resource_id}/{filename}`
14. **NO separate privacy/quality/compliance tabs** — everything on one scrollable result page
15. The **compliance PDF is the primary download CTA** — always foregrounded, never buried
16. Free tier: enforce both job quota (10/mo) AND row cap (10k) — both checked before job starts
17. API Keys are a **Launch feature** — no feature flag, always available (gated by plan, not flag)
18. In-app notifications are a **Launch feature** — no feature flag
19. Never return raw error messages to client — always map to friendly copy
20. `.single()` in supabase-py throws 406 on no rows — use `.limit(1).execute()` and check `.data`

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
| 10 | Privacy risk scorer | ⬜ |
| 11 | Compliance PDF — headline feature | ⬜ |
| 12 | Quality report + correlation validator | ⬜ |
| 13 | Composite trust score UI | ⬜ |
| 14 | Real-time job progress | ⬜ |
| 15 | Freemium quota + billing page | ⬜ |
| 16 | API Keys (Launch feature) | ⬜ |
| 17 | In-app notifications (Launch feature) | ⬜ |
| 18 | Error handling + loading states + onboarding | ⬜ |
| 19 | Dataset list + detail pages | ⬜ |
| 20 | Deployment + production config | ⬜ |
