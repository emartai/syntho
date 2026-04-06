# Syntho — Complete Setup Guide
## Everything You Need to Configure Before Building

> Complete all steps in this guide BEFORE starting Prompt 1. Each section tells you exactly what to set up, where to click, and what values to copy into your .env files.

---

## 0. Design System Setup (Do First)

### Step 1: Load Fonts (Fontshare CDN)
Add to `frontend/app/layout.tsx` inside `<head>`:
```html
<link rel="preconnect" href="https://api.fontshare.com" />
<link
  href="https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&f[]=satoshi@400,500,600,700&display=swap"
  rel="stylesheet"
/>
```
And for JetBrains Mono (monospace / API keys display):
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
```

### Step 2: Install shadcn/ui with Correct Theme
When initializing shadcn, select:
- **Style:** Default
- **Base color:** Violet
- **CSS variables:** Yes
Then override the CSS variables in `globals.css` with the values from `design.md`.

### Step 3: Configure Tailwind
Copy the full Tailwind config from `design.md` → Design Tokens section into `tailwind.config.ts`. This adds custom colors, fonts, shadows, and animations.

### Step 4: Add Global CSS
In `frontend/app/globals.css`, add:
- All CSS variables from `design.md` Color Palette section
- Aurora background keyframe animations
- Glow pulse, helix float, shimmer, fade-up animations
- Glass card base styles

### Step 5: Create Logo Component
After Prompt 1, create `frontend/components/logo/DataHelix.tsx` using the SVG code from `design.md` → Logo section. This component is used in sidebar, navbar, landing page, auth pages, and favicon.

---

## 1. Supabase Setup

### Step 1: Create Project
1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Click **"New Project"**
3. Fill in:
   - **Name:** Syntho
   - **Database Password:** Generate a strong password (save it somewhere safe)
   - **Region:** Choose closest to your users (e.g., eu-west-1 for Europe, us-east-1 for USA, ap-southeast-1 for Africa)
4. Click **"Create new project"** — wait ~2 minutes for it to provision

### Step 2: Get Your API Keys
1. Go to **Settings → API**
2. Copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_KEY` ⚠️ Never expose this to frontend
3. Go to **Settings → JWT Settings**
4. Copy **JWT Secret** → `SUPABASE_JWT_SECRET`

### Step 3: Enable Google OAuth
1. Go to **Authentication → Providers → Google**
2. Toggle **Enable**
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create new project → **APIs & Services → Credentials**
5. Click **"Create Credentials" → OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Add authorized redirect URI: `https://YOUR_SUPABASE_URL/auth/v1/callback`
8. Copy **Client ID** and **Client Secret** → paste into Supabase Google provider
9. Save

### Step 4: Enable GitHub OAuth
1. Go to **Authentication → Providers → GitHub**
2. Toggle **Enable**
3. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
4. Click **"New OAuth App"**
5. Fill in:
   - **Application name:** Syntho
   - **Homepage URL:** your Vercel URL (or http://localhost:3000 for now)
   - **Authorization callback URL:** `https://YOUR_SUPABASE_URL/auth/v1/callback`
6. Copy **Client ID** and **Client Secret** → paste into Supabase GitHub provider
7. Save

### Step 5: Create Storage Buckets
1. Go to **Storage → New bucket**
2. Create these 3 buckets:

   | Bucket Name | Public | Purpose |
   |-------------|--------|---------|
   | `datasets` | ❌ Private | Original uploaded files |
   | `synthetic` | ❌ Private | Generated synthetic files |
   | `reports` | ❌ Private | Compliance PDFs |

### Step 6: Run Database Migrations
1. Go to **SQL Editor → New Query**
2. Run each migration file in order (copy SQL from each file):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_storage_policies.sql`
   - `supabase/migrations/004_freemium_quota.sql`
   - `supabase/migrations/005_indexes.sql`
3. Verify in **Table Editor** that you see: profiles, datasets, synthetic_datasets, trust_scores, privacy_scores, quality_reports, compliance_reports, api_keys, notifications, job_logs

### Step 6b: Enable pg_cron
1. Go to **Database → Extensions**
2. Enable **pg_cron**
3. Then in SQL Editor run:
   ```sql
   SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');
   ```

### Step 7: Enable Realtime
1. Go to **Database → Replication → Supabase Realtime**
2. Enable these tables:
   - `synthetic_datasets` — for live job progress in `useJobProgress`
   - `notifications` — for in-app notification alerts in `useNotifications`

### Step 8: Set Redirect URLs
1. Go to **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000` (change to Vercel URL after deployment)
3. **Redirect URLs:** Add:
   - `http://localhost:3000/**`
   - `https://your-vercel-app.vercel.app/**` (add after deployment)

---

## 2. Modal.com Setup

### Step 1: Create Account
1. Go to [modal.com](https://modal.com) → Sign up (GitHub login recommended)
2. You get **$30 free credits/month** — enough for ~100 CTGAN jobs or ~500 SDV jobs
3. No credit card required to start

### Step 2: Install Modal CLI
On your local machine or backend server:
```bash
pip install modal
modal setup   # opens browser to authenticate
```

### Step 3: Create Modal Secret
Modal secrets store your env variables securely (like Render env vars but for Modal functions):
1. Go to [modal.com/secrets](https://modal.com/secrets)
2. Click **"New Secret"** → **"Custom"**
3. Name it: `syntho-secrets`
4. Add these key-value pairs:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_KEY` — your Supabase service role key
   - `MODAL_API_SECRET` — generate a random string (e.g., `openssl rand -hex 32`) — save this, you'll add it to backend too
5. Save

### Step 4: Deploy the Modal App
After Prompt 7 creates `modal_ml/main.py`:
```bash
cd modal_ml
modal deploy main.py
```
Modal will output a permanent URL like:
```
https://your-username--syntho-ml-run-job.modal.run
```
Copy this URL → `MODAL_API_URL` in your Render backend env vars.

### Step 5: Verify Deployment
```bash
# Test your Modal endpoint is live
curl -X POST https://your-username--syntho-ml-run-job.modal.run \
  -H "X-API-Secret: your_modal_api_secret" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Step 6: Monitor Jobs
1. Go to [modal.com/apps](https://modal.com/apps)
2. Click **syntho-ml** to see:
   - Running functions
   - GPU usage
   - Logs per job
   - Credit consumption

### Key Facts About Modal Free Tier
| | Detail |
|--|--------|
| Free credits | $30/month (resets monthly) |
| GPU | T4 (16GB VRAM) |
| CPU fallback | 4 vCPU, 32GB RAM |
| Max function timeout | 1 hour |
| Cold start | ~2–3 seconds (warm container) |
| Always on? | ✅ Yes — no browser needed, runs 24/7 |
| Credit alert | Set spending limit in Modal dashboard to avoid surprises |

### Estimated Credit Usage per Job
| Job Type | Approx. Cost |
|----------|-------------|
| SDV Gaussian Copula (10k rows) | ~$0.05 |
| CTGAN (10k rows, 300 epochs) | ~$0.25 |
| Privacy scoring | ~$0.02 |
| Full pipeline (generate + all reports) | ~$0.30–$0.40 |

At $30/month free credits: ~75–100 full pipeline jobs free per month.

---

## 3. Flutterwave Setup

### Step 1: Create Account
1. Go to [flutterwave.com](https://flutterwave.com) → Sign up
2. Complete business verification (required for live payments)
3. For testing: use **Test Mode** (no verification needed)

### Step 2: Get API Keys
1. Go to **Settings → API Keys**
2. Toggle to **Test Mode** first
3. Copy:
   - **Public Key** → `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`
   - **Secret Key** → `FLUTTERWAVE_SECRET_KEY`

### Step 3: Set Up Webhook
1. Go to **Settings → Webhooks**
2. Add webhook URL: `https://your-vercel-app.vercel.app/api/webhooks/flutterwave`
3. Copy the **Webhook Secret Hash** → `FLUTTERWAVE_WEBHOOK_HASH`
4. Select events: Payment, Transfer

### Step 4: Test Credentials (for development)
Use these test card details when testing:
- **Card Number:** 5531 8866 5214 2950
- **CVV:** 564
- **Expiry:** 09/32
- **PIN:** 3310
- **OTP:** 12345

### Step 5: Go Live (when ready)
1. Complete business KYC in Flutterwave dashboard
2. Switch from Test keys to Live keys in your env variables
3. Update webhook URL to production backend URL

---

## 4. Render Setup (Backend)

### Step 1: Create Account
1. Go to [render.com](https://render.com) → Sign up with GitHub

### Step 2: Create Web Service
1. Click **"New" → Web Service**
2. Connect your GitHub repository
3. Select your repo → select the `backend/` folder
4. Configure:
   - **Name:** syntho-api
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

### Step 3: Add Environment Variables
In Render dashboard → **Environment**, add:

| Variable | Value |
|----------|-------|
| SUPABASE_URL | from Supabase → Settings → API |
| SUPABASE_SERVICE_KEY | from Supabase (service_role key) |
| SUPABASE_JWT_SECRET | from Supabase → Settings → JWT |
| FLUTTERWAVE_SECRET_KEY | from Flutterwave |
| FLUTTERWAVE_WEBHOOK_HASH | from Flutterwave |
| MODAL_API_URL | from modal deploy output |
| MODAL_API_SECRET | random 32-char string (`openssl rand -hex 32`) |
| FRONTEND_URL | your Vercel URL |
| FREE_JOBS_QUOTA | 10 |
| FREE_ROW_CAP | 10000 |

### Step 4: Get Your Backend URL
After deployment, Render gives you a URL like: `https://syntho-api.onrender.com`
- Copy this → `NEXT_PUBLIC_API_URL` in your frontend Vercel env vars

---

## 5. UptimeRobot Setup (Keep Render Awake)

### Step 1: Create Account
1. Go to [uptimerobot.com](https://uptimerobot.com) → Sign up free

### Step 2: Add Monitor
1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Syntho API
   - **URL:** `https://syntho-api.onrender.com/health`
   - **Monitoring Interval:** Every 5 minutes
3. Click **"Create Monitor"**

This pings your Render backend every 5 minutes, preventing it from sleeping.

---

## 6. Vercel Setup (Frontend)

### Step 1: Create Account
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub

### Step 2: Deploy Frontend
1. Click **"New Project"**
2. Import your GitHub repository
3. **Root Directory:** `frontend/`
4. **Framework Preset:** Next.js (auto-detected)

### Step 3: Add Environment Variables
In Vercel → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_SUPABASE_URL | from Supabase → Settings → API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | from Supabase (anon key only) |
| NEXT_PUBLIC_API_URL | your Render backend URL |
| NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY | from Flutterwave |
| NEXT_PUBLIC_SAMPLE_DATASET_PATH | datasets/sample/nigerian_retail_sample.csv |

### Step 4: Update OAuth Redirect URLs
After Vercel gives you a URL (e.g., `https://syntho.vercel.app`):
1. Go back to Supabase → **Authentication → URL Configuration**
2. Update **Site URL** to your Vercel URL
3. Add `https://syntho.vercel.app/**` to **Redirect URLs**
4. Update your Google OAuth app in Google Cloud Console with the same Vercel URL
5. Update your GitHub OAuth app with the same Vercel URL

---

## 7. Local Development Setup

### Prerequisites
Install these before starting:
- Node.js 18+ → [nodejs.org](https://nodejs.org)
- Python 3.11+ → [python.org](https://python.org)
- Git → [git-scm.com](https://git-scm.com)

### Frontend Local Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in .env.local with your values
npm run dev
# Runs on http://localhost:3000
```

### Backend Local Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your values
uvicorn app.main:app --reload --port 8000
# Runs on http://localhost:8000
```

For local development, set `NEXT_PUBLIC_API_URL=http://localhost:8000` in frontend `.env.local`

---

## 8. Environment Variables Master Checklist

Before running Prompt 1, confirm you have all of these:

### Frontend (.env.local)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase Dashboard → Settings → API
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Dashboard → Settings → API (anon key)
- [ ] `NEXT_PUBLIC_API_URL` — Your Render backend URL (e.g., https://syntho-api.onrender.com)
- [ ] `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` — Flutterwave Dashboard → Settings → API Keys
- [ ] `NEXT_PUBLIC_SAMPLE_DATASET_PATH` — `datasets/sample/nigerian_retail_sample.csv`

### Backend (.env)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_KEY` — service_role key (never anon)
- [ ] `SUPABASE_JWT_SECRET` — Supabase → Settings → JWT Settings
- [ ] `MODAL_API_URL` — from `modal deploy` output
- [ ] `MODAL_API_SECRET` — match what you put in Modal syntho-secrets
- [ ] `FRONTEND_URL` — your Vercel URL
- [ ] `FLUTTERWAVE_SECRET_KEY`
- [ ] `FLUTTERWAVE_WEBHOOK_HASH`
- [ ] `FREE_JOBS_QUOTA=10`
- [ ] `FREE_ROW_CAP=10000`

### Modal ML (modal.com/secrets → syntho-secrets)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `MODAL_API_SECRET`

---

## 9. Recommended Build Order

Follow this exact order. Each prompt builds on the previous.

```
Week 1: Foundation (Prompts 1–6)
  Day 1-2: Complete all setup steps in this guide
  Day 3:   Prompt 1 (Scaffold + Design System) + Prompt 2 (Supabase + Auth)
  Day 4:   Prompt 3 (Layout + Dashboard Shell) + Prompt 4 (Upload UI + Dropzone)
  Day 5:   Prompt 5 (FastAPI Backend + Quota) + Prompt 6 (Schema Detection)
  Checkpoint: Can users sign in, upload a file, and see schema? ✓

Week 2: ML Pipeline (Prompts 7–9 + 14)
  Day 1:   Prompt 7 (Modal.com Setup) — deploy ML service, get permanent URL → add to Render env
  Day 2:   Prompt 8 (Gaussian Copula Generator) — test free-tier generation end-to-end
  Day 3:   Prompt 9 (CTGAN Generator) — GPU-accelerated generation for Pro plan
  Day 4:   Prompt 14 (Real-Time Job Progress) — Supabase Realtime + progress UI
  Day 5:   Full pipeline test: upload → generate → see results live
  Checkpoint: Can users generate synthetic data without you touching anything? ✓

Week 3: Scores + Reports (Prompts 10–13)
  Day 1:   Prompt 10 (Privacy Scorer — Presidio)
  Day 2:   Prompt 11 (Compliance PDF — headline feature)
  Day 3:   Prompt 12 (Quality Report + Correlation Validator)
  Day 4:   Prompt 13 (Composite Trust Score UI — single page, no tabs)
  Day 5:   Full end-to-end test: upload → generate → download PDF
  Checkpoint: Is the compliance PDF generating and downloadable? ✓

Week 4: Monetisation + API (Prompts 15–17)
  Day 1:   Prompt 15 (Freemium Quota + Billing Page + Flutterwave upgrade)
  Day 2:   Prompt 16 (API Keys — Pro/Growth)
  Day 3:   Prompt 17 (In-App Notifications)
  Day 4-5: Prompts 18–19 (Error Handling + Dataset Pages)
  Checkpoint: Can free users upgrade? Can Pro users generate API keys? ✓

Week 5: Polish + Launch (Prompt 20)
  Day 1-2: Prompt 20 (Deployment + Production Config)
  Day 3:   Run all security checklist items from security.md
  Day 4:   Smoke test entire user journey on production
  Day 5:   Upload sample dataset, verify onboarding flow
  Launch!
```

---

## 10. Pre-Launch Verification

Run these commands before going live:

```bash
# Frontend — must pass with zero errors
cd frontend && npm run build
cd frontend && npx tsc --noEmit
cd frontend && npx next lint

# Backend — start locally and test /health
cd backend && .venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}

# Test full user journey manually (5 steps):
# 1. Sign in with Google or GitHub
# 2. Upload the sample dataset (or any small CSV)
# 3. Click Generate → Gaussian Copula → Generate Now
# 4. Watch real-time progress bar complete
# 5. Download the compliance PDF
```

### Manual Verification Checklist

- [ ] Google OAuth login works → profile auto-created in profiles table
- [ ] GitHub OAuth login works
- [ ] Upload a CSV → schema detected and displayed correctly
- [ ] Free user: CTGAN option is locked with upgrade prompt
- [ ] Generate (Gaussian Copula) → progress updates in real-time
- [ ] Trust score appears on result page (composite 0–100 number)
- [ ] Compliance PDF downloads successfully
- [ ] Notification appears: "Your synthetic dataset is ready"
- [ ] Free user at 10 jobs → quota_exhausted notification + upgrade prompt
- [ ] Pro user: CTGAN available, no row cap warning
- [ ] API key creation works for Pro user
- [ ] API key auth works: `Bearer sk_live_...` accepted on generate endpoint
- [ ] User A cannot access User B's datasets (RLS test)

---

## 11. Quick Troubleshooting Reference

| Problem | Solution |
|---------|----------|
| Supabase auth redirect not working | Check redirect URLs in Supabase + OAuth provider match exactly |
| Render backend sleeping | Check UptimeRobot is pinging /health every 5 min |
| Modal job not starting | Check MODAL_API_SECRET matches in backend .env and Modal secret |
| Modal cold start slow | First request after deploy takes ~5s — normal, subsequent requests are instant |
| Modal GPU out of memory | Reduce CTGAN batch_size to 200 in generation config |
| Modal credits running low | Upgrade to Modal paid plan or reduce epoch count |
| Flutterwave payment not verifying | Check you're using Test keys in test mode, Live keys in production |
| Supabase Realtime not updating | Check table is enabled in Database → Replication |
| Redis connection failing | Verify REDIS_URL uses the Render internal URL format |
| CORS errors | Update FastAPI CORS origins to include your exact Vercel URL |
