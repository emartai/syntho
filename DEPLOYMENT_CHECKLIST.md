# Syntho Deployment Checklist

**Deployment order: Modal → Supabase config → Render → Vercel**

---

## PRE-LAUNCH (complete before deploying anything)

- [ ] All Supabase migrations run in order (001 → 006) — see `SUPABASE_CHECKLIST.md`
- [ ] Supabase storage buckets created: `datasets`, `synthetic`, `reports` (all **private**)
- [ ] Supabase Realtime enabled for `synthetic_datasets` table only
- [ ] Supabase OAuth providers configured (Google + GitHub) with production redirect URLs
- [ ] All environment variables ready — fill in from `.env.production.example`

---

## STEP 1 — MODAL (ML Engine)

- [ ] `cd modal_ml && modal deploy`
- [ ] Copy the endpoint URL → set as `MODAL_API_URL` in backend env vars
- [ ] Test endpoint: `curl -X POST $MODAL_API_URL/health`
- [ ] Confirm the Modal secret `syntho-secrets` has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

---

## STEP 2 — BACKEND (Render)

- [ ] Push codebase to GitHub
- [ ] In Render dashboard: New Web Service → connect GitHub repo → select `/backend` root directory
- [ ] Set **Build Command**: `pip install -r requirements.txt`
- [ ] Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
- [ ] Set **Health Check Path**: `/health`
- [ ] Enable **Auto-Deploy**: yes
- [ ] Add all backend env vars in Render dashboard:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `MODAL_API_URL`
  - `MODAL_API_SECRET`
  - `FRONTEND_URL` (your Vercel URL)
  - `ALLOWED_ORIGINS` (your Vercel URL)
  - Optional: `GROQ_API_KEY`, `REDIS_URL`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`
- [ ] Deploy and wait for health check to pass
- [ ] Test: `curl https://your-backend.onrender.com/health`
  → Expected: `{"status":"ok","version":"1.0.0","env":"production"}`

---

## STEP 3 — FRONTEND (Vercel)

- [ ] In Vercel dashboard: New Project → Import from GitHub → select root directory
- [ ] Framework: **Next.js** (auto-detected)
- [ ] Build Command: `npm run build` (from `frontend/` directory — set root to `frontend/`)
- [ ] Add all frontend env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (your Render URL)
  - `NEXT_PUBLIC_SITE_URL` (your Vercel URL, for OG image base URL)
  - All `NEXT_PUBLIC_FLAG_*` vars → all `false` for MVP
- [ ] Deploy and confirm build passes with zero errors
- [ ] Test: visit `/login` → Google OAuth works end to end

---

## STEP 4 — SUPABASE OAUTH CALLBACK

- [ ] In Supabase → Authentication → URL Configuration:
  - Add Site URL: `https://yourdomain.vercel.app`
  - Add Redirect URL: `https://yourdomain.vercel.app/auth/callback`

---

## POST-DEPLOY SMOKE TEST

Run through the core user journey after going live:

- [ ] Sign up with Google → confirm profile row in `profiles` table
- [ ] Upload a small CSV (100 rows) → confirm `datasets` row with `status='ready'`
- [ ] Start a generation job → confirm progress bar moves in real time
- [ ] Wait for completion → confirm synthetic file downloadable
- [ ] Open Privacy Score tab → score renders correctly
- [ ] Open Compliance Report tab → PDF download works
- [ ] Hit free quota (3 jobs) → 402 error and upgrade prompt appear
- [ ] Visit `/marketplace` → 404 page (flag is false — correct)
- [ ] Submit waitlist email on landing page → row in `waitlist` table
- [ ] Test on mobile (375px) → landing page and dashboard responsive
- [ ] Test in Safari on iOS → PDF download works

---

## MONITORING

- [ ] **UptimeRobot**: create HTTP monitor for Render `/health` URL, 5-min interval
- [ ] **Vercel Analytics**: enable in Vercel dashboard (free tier)
- [ ] **Supabase Alerts**: enable usage alerts for database size and API requests
- [ ] **Render Alerts**: configure email alert for deploy failures

---

## ROLLBACK PLAN

If a deployment fails:
1. Revert in Vercel/Render to the previous successful deployment (one click in dashboard)
2. Database migrations are additive — no rollback needed unless `001` through `006` were re-run
3. Modal can be rolled back with `modal deploy --name <previous-version>`
