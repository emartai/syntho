<div align="center">

# 〔 SYNTHO 〕

### Generate safe synthetic data. Score privacy risk. Monetize your datasets.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Modal](https://img.shields.io/badge/Modal-GPU%20ML-7C3AED?style=flat-square)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Live Demo](https://syntho.vercel.app) · [API Docs](https://syntho-backend.onrender.com/api/docs) · [Roadmap](roadmap.md)

</div>

---

## What is Syntho?

Syntho lets you upload a real dataset, generate a statistically faithful synthetic version using GPU-backed ML (CTGAN, Gaussian Copula), score its privacy risk, and download a GDPR/HIPAA compliance report — all in under 5 minutes.

**Core MVP flow:**
```
Upload CSV / JSON / Parquet
        ↓
Schema detection + preview
        ↓
Choose generation method (CTGAN or Gaussian Copula)
        ↓
GPU-backed generation on Modal.com (T4)
        ↓
Privacy score + correlation fidelity + compliance PDF
        ↓
Download synthetic dataset
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Radix UI |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| Database | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Auth | Supabase Auth — Google & GitHub OAuth |
| ML Engine | Modal.com (T4 GPU) — CTGAN, Gaussian Copula, SDV |
| Privacy | Microsoft Presidio — PII detection |
| Hosting | Vercel (frontend) · Render (backend) · Modal (ML) |
| Payments | Flutterwave (v2 — marketplace) |

---

## Features

### MVP (live)
- **Drag-and-drop upload** — CSV, JSON, Parquet, Excel up to 500 MB
- **Auto schema detection** — column types, row counts, sample preview
- **CTGAN generation** — deep learning GAN-based synthetic data
- **Gaussian Copula** — fast, statistical synthetic generation
- **Real-time job progress** — Supabase Realtime websocket updates
- **Privacy scorer** — 0–100 privacy score, PII detection, risk level
- **Correlation validator** — statistical fidelity vs original data
- **Quality report** — column-level distribution comparison
- **Compliance PDF** — GDPR + HIPAA compliance report
- **Freemium quota** — 3 free jobs/month, unlimited on Pro

### v2 (coming soon — feature-flagged)
- Marketplace — buy & sell synthetic datasets
- API keys — programmatic access
- Groq AI advisor — method recommendation, compliance explainer
- Team accounts — shared workspaces

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+, Python 3.11+
- [Supabase](https://supabase.com) project
- [Modal.com](https://modal.com) account

### 1. Clone

```bash
git clone https://github.com/emartai/syntho.git
cd syntho
```

### 2. Run Supabase migrations

In your Supabase project → SQL Editor, run in order:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage_policies.sql
supabase/migrations/004_freemium_quota.sql
supabase/migrations/005_waitlist.sql
supabase/migrations/006_indexes.sql
```

Create 3 private storage buckets: `datasets`, `synthetic`, `reports`

Enable the `pg_cron` extension (Database → Extensions).

### 3. Backend

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate  # Windows
# or: source .venv/bin/activate                        # Mac/Linux

pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn app.main:app --reload --port 8000
```

### 4. Modal ML

```bash
pip install modal
modal token new

# Create secret with your Supabase + Modal credentials
modal secret create syntho-secrets \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_KEY=... \
  MODAL_API_SECRET=...

modal deploy modal_ml/main.py
# → copies the endpoint URL into backend/.env MODAL_API_URL
```

### 5. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Modal (deploy first — get the endpoint URL)
```bash
modal deploy modal_ml/main.py
```

### Backend → Render
1. Connect GitHub repo to [Render](https://render.com)
2. Create a **Web Service**, Render auto-detects `backend/render.yaml`
3. Add env vars from `backend/.env.example` (use real values)

### Frontend → Vercel
1. Import GitHub repo in [Vercel](https://vercel.com)
2. Add env vars from `frontend/.env.local.example`
3. Set `NEXT_PUBLIC_API_URL` to your Render backend URL
4. Set all `NEXT_PUBLIC_FLAG_*` to `false` for MVP

> After Vercel deploys, update `ALLOWED_ORIGINS` on Render to your Vercel URL.

---

## Project Structure

```
syntho/
├── frontend/                  # Next.js 14 app
│   ├── app/                   # App Router pages
│   │   ├── (auth)/            # Login / signup
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # Next.js API routes (webhooks, auth)
│   ├── components/
│   │   ├── layout/            # Sidebar, Navbar
│   │   ├── providers/         # Auth, Query providers
│   │   ├── reports/           # Privacy, Quality, Compliance report UIs
│   │   └── ui/                # shadcn/ui primitives
│   ├── hooks/                 # useJobProgress, useAuth, useNotifications
│   ├── lib/                   # API client, Supabase, feature flags
│   └── vercel.json            # Security headers, CSP
│
├── backend/                   # FastAPI backend
│   ├── app/
│   │   ├── routers/           # datasets, generate, synthetic, reports,
│   │   │                      # marketplace, ai, api-keys, webhooks, admin
│   │   ├── services/          # supabase, storage, modal_client, ai_advisor
│   │   ├── middleware/        # auth (JWT), rate_limit
│   │   └── models/            # Pydantic schemas
│   ├── render.yaml            # Render deployment config
│   └── requirements.txt
│
├── modal_ml/                  # GPU ML pipeline (runs on Modal.com)
│   ├── main.py                # FastAPI endpoint + generate_synthetic function
│   ├── ctgan_generator.py     # CTGAN via SDV
│   ├── sdv_generator.py       # Gaussian Copula via SDV
│   ├── privacy_scorer.py      # Presidio PII detection
│   ├── quality_reporter.py    # Column distribution analysis
│   ├── compliance_reporter.py # GDPR/HIPAA report
│   ├── correlation_validator.py
│   └── utils.py               # Supabase client, storage helpers
│
└── supabase/
    └── migrations/            # 001–006 SQL migrations (run in order)
```

---

## API Reference

Backend auto-generates docs when running locally:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

Core MVP endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/datasets` | Upload dataset |
| GET | `/api/v1/datasets` | List datasets |
| GET | `/api/v1/datasets/{id}` | Dataset detail + schema |
| POST | `/api/v1/generate` | Trigger synthetic generation |
| GET | `/api/v1/generate/{id}/status` | Poll job status |
| PATCH | `/api/v1/generate/{id}/cancel` | Cancel running job |
| GET | `/api/v1/synthetic` | List synthetic datasets |
| GET | `/api/v1/reports/compliance/{id}` | Get compliance report |

---

## Environment Variables

See `.env.production.example` for the full list with documentation.

**Required for MVP:**

| Variable | Where |
|----------|-------|
| `SUPABASE_URL` | Backend + Modal |
| `SUPABASE_SERVICE_KEY` | Backend + Modal |
| `SUPABASE_JWT_SECRET` | Backend |
| `MODAL_API_URL` | Backend |
| `MODAL_API_SECRET` | Backend + Modal |
| `FRONTEND_URL` | Backend (CORS) |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend |
| `NEXT_PUBLIC_API_URL` | Frontend |

---

## Security

- All secrets via environment variables — never hardcoded
- Supabase RLS policies on every table — users can only access their own data
- JWT validation on every protected backend route
- CORS restricted to allowed origins only
- Rate limiting on all `/api/v1/` routes
- Security headers via `vercel.json` (CSP, HSTS, X-Frame-Options)

> **Note:** If you forked this repo and any `.env` files were previously committed, rotate all secrets immediately: Supabase service key, JWT secret, Modal API secret, and Flutterwave keys.

---

## Roadmap

See [roadmap.md](roadmap.md) for the full MVP → v2 → v3 plan.

---

## License

MIT — see [LICENSE](LICENSE) for details.
