# Syntho Production Deployment Guide (Prompt 20)

## 1) Modal deployment

```bash
pip install modal
modal token new

modal secret create syntho-secrets \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_KEY=... \
  MODAL_API_SECRET=...

modal deploy modal_ml/main.py
```

After deploy, copy the Modal web endpoint URL and set it as `MODAL_API_URL` in backend production env.

## 2) Backend on Render

- Use `backend/render.yaml`.
- Service name: `syntho-backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-server-header`
- Health check path: `/health`

## 3) Backend env vars

Use `backend/.env.production.example` as the source of truth for required + optional vars.

## 4) Frontend on Vercel

- Use `frontend/vercel.json` security headers.
- No rewrites required (frontend calls backend directly via `NEXT_PUBLIC_API_URL`).
- Use `frontend/.env.production.example` for env vars.

## 5) Supabase production checklist

Run migrations in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_policies.sql`
4. `supabase/migrations/004_freemium_quota.sql`
5. `supabase/migrations/005_waitlist.sql`
6. `supabase/migrations/006_indexes.sql`

Then complete:
- [ ] Enable `pg_cron` extension.
- [ ] Enable Realtime for `synthetic_datasets` and `notifications` tables.
- [ ] Create private storage buckets: `datasets`, `synthetic`, `reports`.
- [ ] Confirm storage policies from migration 003 are active.
- [ ] Add Vercel production URL + preview URLs to Auth redirect URLs.
- [ ] Enable Google and GitHub OAuth providers.

## 6) Final CORS configuration

- `ALLOWED_ORIGINS`: comma-separated explicit origins, include production frontend URL.
- `ALLOWED_ORIGIN_REGEX`: `^https://.*\\.vercel\\.app$` for preview deployments.

## 7) Health monitoring

Configure UptimeRobot:
- Monitor URL: `https://syntho-backend.onrender.com/health`
- Interval: every 5 minutes.

This also prevents Render free-tier cold starts from long idle sleep.

## 8) Pre-launch security checklist

- [ ] No secrets in git history (`git log --all -p | grep -i "secret\|key\|password"`).
- [ ] Verify Supabase RLS with non-admin JWTs.
- [ ] Confirm rate limiting is active on all `/api/v1/*` routes.
- [ ] Confirm file upload MIME + magic-byte validation paths.
- [ ] Confirm Flutterwave webhook hash verification on every webhook.
- [ ] Confirm all API errors are generic (no stack traces leaked).
- [ ] Confirm HTTPS-only endpoints (Render + Vercel).

## 9) Sample dataset for onboarding

A production-ready sample CSV is included in this repository:
- Local file: `samples/nigerian_retail_sample.csv`
- Upload to Supabase Storage path: `datasets/sample/nigerian_retail_sample.csv`
- Set frontend env var:
  - `NEXT_PUBLIC_SAMPLE_DATASET_PATH=datasets/sample/nigerian_retail_sample.csv`
