# Syntho — Project Context
## Paste this + security.md + design.md at the start of every prompt session

---

## 🧠 Project Overview

**Syntho** is a full-stack Synthetic Data Marketplace SaaS. Companies use it to:
- Upload real datasets and generate safe synthetic versions
- Score privacy risk and auto-generate GDPR/HIPAA compliance reports
- Validate that synthetic data statistically mirrors real data
- List, sell, and buy synthetic datasets on a marketplace
- Integrate synthetic data generation into ML pipelines via REST API

**Design:** Plasma Aurora UI + Data Helix Logo (see design.md for full spec)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.11) on Render (free tier) |
| Auth | Supabase Auth — Google + GitHub OAuth |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime — job progress tracking |
| Job Queue | BullMQ + Redis (Render free Redis 25MB) |
| ML Engine | Modal.com — always-on T4 GPU (CTGAN, SDV, Presidio) |
| PDF Reports | ReportLab (Python) |
| Payments | Flutterwave |
| Frontend Deploy | Vercel |
| Backend Uptime | UptimeRobot pings /health every 5 min |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios + TanStack React Query |

---

## 📁 Folder Structure

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
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── generate/[id]/page.tsx
│   │   │   ├── marketplace/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── sell/page.tsx
│   │   │   ├── api-keys/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── api/webhooks/flutterwave/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── brand/
│   │   │   └── Logo.tsx           # Data Helix SVG logo
│   │   ├── layout/
│   │   │   ├── AuroraBackground.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Navbar.tsx
│   │   ├── upload/
│   │   │   ├── Dropzone.tsx
│   │   │   └── SchemaPreview.tsx
│   │   ├── datasets/
│   │   │   ├── DatasetCard.tsx
│   │   │   └── DatasetTable.tsx
│   │   ├── reports/
│   │   │   ├── QualityReport.tsx
│   │   │   ├── PrivacyScore.tsx
│   │   │   └── ComplianceReport.tsx
│   │   ├── marketplace/
│   │   │   ├── ListingCard.tsx
│   │   │   └── CheckoutModal.tsx
│   │   ├── charts/
│   │   │   ├── DistributionChart.tsx
│   │   │   └── CorrelationHeatmap.tsx
│   │   └── shared/
│   │       ├── JobProgress.tsx
│   │       └── ApiKeyCard.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── api.ts
│   │   ├── flutterwave.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useDatasets.ts
│   │   ├── useJobProgress.ts
│   │   └── useAuth.ts
│   ├── types/index.ts
│   ├── .env.local
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
│   │   │   ├── marketplace.py
│   │   │   ├── api_keys.py
│   │   │   └── webhooks.py
│   │   ├── services/
│   │   │   ├── supabase.py
│   │   │   ├── storage.py
│   │   │   ├── modal_client.py
│   │   │   ├── schema_detector.py
│   │   │   ├── pdf_generator.py
│   │   │   └── flutterwave.py
│   │   ├── models/schemas.py
│   │   └── middleware/auth.py
│   ├── requirements.txt
│   ├── Procfile
│   └── .env
│
└── modal_ml/
    ├── main.py
    ├── ctgan_generator.py
    ├── sdv_generator.py
    ├── privacy_scorer.py
    ├── correlation_validator.py
    ├── quality_reporter.py
    ├── compliance_reporter.py
    ├── utils.py
    └── requirements.txt
```

---

## 🗄️ Supabase Database Schema

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  flutterwave_subaccount_id TEXT,
  bank_account_verified BOOLEAN DEFAULT FALSE,
  api_quota INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','ready','error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE synthetic_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  generation_method TEXT CHECK (generation_method IN ('ctgan','gaussian_copula','tvae')),
  file_path TEXT,
  row_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  job_id TEXT,
  progress INTEGER DEFAULT 0,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE privacy_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2),
  pii_detected JSONB,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('gdpr','hipaa','combined')),
  file_path TEXT,
  passed BOOLEAN,
  findings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  preview_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES marketplace_listings(id),
  amount NUMERIC(10,2),
  currency TEXT,
  flutterwave_tx_ref TEXT UNIQUE,
  flutterwave_tx_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT,
  title TEXT,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT,
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id),
  event TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
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
REDIS_URL=your_render_redis_url
GROQ_API_KEY=your_groq_api_key
```

### Modal ML (modal.com/secrets → syntho-secrets)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
MODAL_API_SECRET=your_modal_shared_secret
```

---

## 📦 Dependencies

### Backend (requirements.txt)
```
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.9
supabase==2.3.4
pandas==2.1.4
pyarrow==14.0.2
openpyxl==3.1.2
python-jose[cryptography]==3.3.0
httpx==0.26.0
reportlab==4.0.9
redis==5.0.1
python-dotenv==1.0.0
pydantic==2.5.3
python-magic==0.4.27
```

### Modal ML (modal_ml/requirements.txt)
```
modal==0.62.0
sdv==1.9.0
ctgan==0.7.5
scikit-learn==1.3.2
scipy==1.11.4
presidio-analyzer==2.2.354
presidio-anonymizer==2.2.354
ydata-profiling==4.6.4
matplotlib==3.8.2
seaborn==0.13.1
reportlab==4.0.9
supabase==2.3.4
pandas==2.1.4
pyarrow==14.0.2
fastapi==0.109.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "next": "14.1.0",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.1",
    "@supabase/supabase-js": "2.39.3",
    "@supabase/ssr": "0.1.0",
    "react-dropzone": "14.2.3",
    "@tanstack/react-query": "5.17.19",
    "recharts": "2.10.4",
    "react-hook-form": "7.49.3",
    "zod": "3.22.4",
    "axios": "1.6.5",
    "flutterwave-react-v3": "1.0.9",
    "lucide-react": "0.309.0",
    "date-fns": "3.2.0",
    "sonner": "1.3.1",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.0"
  }
}
```

---

## 🔄 ML Pipeline Flow

```
1. User uploads CSV/JSON/Parquet → FastAPI → Supabase Storage
2. FastAPI detects schema (pandas) → saves to datasets table
3. User selects generation method + config on /generate/[id]
4. FastAPI creates synthetic_datasets record (status: pending)
5. FastAPI POST → Modal.com web endpoint (always-on, T4 GPU)
6. Modal runs:
   a. Downloads original file from Supabase Storage
   b. CTGAN or SDV Gaussian Copula generation
   c. Presidio PII scanner → privacy score
   d. Correlation + distribution validation
   e. Quality comparison stats
   f. GDPR/HIPAA compliance PDF (ReportLab)
   g. Uploads all outputs to Supabase Storage
   h. Updates all DB tables (synthetic_datasets, privacy_scores, quality_reports, compliance_reports)
7. Supabase Realtime → frontend progress updates
8. User sees completed reports + download links
```

---

## 💳 Flutterwave Payment Flow

```
Buyer clicks "Purchase" on marketplace listing
  → Frontend calls Flutterwave inline checkout (with seller subaccount for 80/20 split)
  → On success → POST /api/v1/purchases/verify with tx_ref
  → Backend calls Flutterwave API to verify transaction
  → Backend creates purchases record (status: completed)
  → Backend generates signed download URL (1hr expiry)
  → Webhook arrives → backend logs + reconciles
```

---

## 📋 Naming Conventions

- Files: kebab-case (`dataset-card.tsx`, `privacy-scorer.py`)
- Components: PascalCase (`DatasetCard`, `PrivacyScore`)
- Functions: camelCase (`getDatasets`, `generateSyntheticData`)
- DB tables: snake_case (`synthetic_datasets`, `compliance_reports`)
- API routes: `/api/v1/datasets`, `/api/v1/generate`
- Storage buckets: `datasets` | `synthetic` | `reports`
- Storage paths: `{bucket}/{user_id}/{resource_id}/{filename}`

---

## 📎 Companion Files

- **security.md** — Auth patterns, input validation, secret management, rate limiting, payment verification, pre-launch checklist
- **design.md** — Full Plasma Aurora + Data Helix design system. Colors, typography, components, animations, logo spec
- **setup-guide.md** — Step-by-step setup for Supabase, Modal, Flutterwave, Render, Vercel, UptimeRobot
- **25-prompts.md** — All 25 build prompts, ready to copy-paste
- **api-reference.md** — Complete API endpoint documentation

---

## 🚦 Build Progress Tracker

| # | Module | Status |
|---|--------|--------|
| 1 | Project scaffold + design system setup | ⬜ |
| 2 | Supabase schema + auth (Google/GitHub) | ⬜ |
| 3 | Layout shell — Sidebar, Navbar, AuroraBackground | ⬜ |
| 4 | Upload UI — Dropzone + Schema Preview | ⬜ |
| 5 | FastAPI setup + file handling + storage | ⬜ |
| 6 | Schema detection engine | ⬜ |
| 7 | Modal.com ML pipeline setup | ⬜ |
| 8 | Statistical mimicry (SDV) | ⬜ |
| 9 | GAN-based generation (CTGAN) | ⬜ |
| 10 | Privacy risk scorer | ⬜ |
| 11 | GDPR/HIPAA compliance PDF | ⬜ |
| 12 | Correlation preservation validator | ⬜ |
| 13 | Data quality comparison report | ⬜ |
| 14 | Realtime job tracking UI | ⬜ |
| 15 | Marketplace — browse + search | ⬜ |
| 16 | Marketplace — seller side | ⬜ |
| 17 | Flutterwave checkout | ⬜ |
| 18 | Marketplace split payments | ⬜ |
| 19 | API key management | ⬜ |
| 20 | Public REST API + rate limiting | ⬜ |
| 21 | User dashboard + analytics | ⬜ |
| 22 | Admin panel | ⬜ |
| 23 | Notifications + email | ⬜ |
| 24 | Error handling + loading states | ⬜ |
| 25 | Deployment + final config | ⬜ |

---

## ⚠️ Key Rules for Claude

1. Always use **TypeScript** — no plain JS
2. Use **Supabase SSR client** in server components, browser client in client components
3. All API calls go through **`/lib/api.ts`** Axios instance with auth headers
4. All DB writes use **Supabase service role key** (backend only — never frontend)
5. File paths in DB are **Storage paths**, not full URLs
6. **Never expose** Supabase service key or any secrets to frontend
7. Use **shadcn/ui** components before writing custom ones
8. All forms: **React Hook Form + Zod**
9. All async data: **TanStack React Query**
10. Supabase Realtime subscriptions in **custom hooks** (`/hooks/`)
11. Follow **security.md** for all auth, file upload, payment, DB code
12. Follow **design.md** for all UI — Bricolage Grotesque headings, Plus Jakarta Sans body, aurora palette
13. File storage paths: `{bucket}/{user_id}/{resource_id}/{filename}`
14. Privacy score >= 40 required before marketplace listing (server-side enforced)
15. Never return raw error messages to client
