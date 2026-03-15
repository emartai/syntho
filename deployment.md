# Syntho — Deployment Guide
## Production deployment, env management, and rollback procedures

---

## Architecture Overview

```
Internet
    │
    ├─→ Vercel (frontend Next.js)          — syntho.vercel.app
    ├─→ Render (FastAPI backend)            — syntho-api.onrender.com
    ├─→ Modal.com (ML workers, GPU)         — syntho-ml.modal.run
    ├─→ Supabase (DB + Auth + Storage)      — managed cloud
    └─→ UptimeRobot (keep-alive pinger)     — pings Render /health every 5min
```

---

## Pre-Deployment Checklist

Run through ALL items before going live:

### Code
- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] No `console.log` statements with sensitive data
- [ ] All `.env.example` files updated with new variables
- [ ] `npm run build` passes locally without errors
- [ ] All Pydantic models validated
- [ ] All API routes tested with Postman/curl

### Security (see security.md)
- [ ] RLS enabled on all Supabase tables
- [ ] CORS locked to production Vercel URL only
- [ ] No secrets hardcoded anywhere in source
- [ ] Flutterwave webhook hash configured
- [ ] Modal API secret is a strong random string (32+ chars)
- [ ] Rate limiting active and tested
- [ ] File upload MIME type validation active
- [ ] Privacy score >= 40 enforced on marketplace listing

### Infrastructure
- [ ] Supabase: production OAuth redirect URLs set
- [ ] Supabase: Realtime enabled for synthetic_datasets + notifications
- [ ] Render: all env vars set
- [ ] Render: UptimeRobot pinging /health every 5 min
- [ ] Modal: secrets configured, app deployed, URL copied to Render
- [ ] Vercel: all NEXT_PUBLIC_ env vars set
- [ ] Flutterwave: webhook URL updated to production

---

## Step-by-Step Production Deploy

### 1. Deploy Modal ML (do this FIRST)
```bash
cd modal_ml
pip install modal
modal setup           # authenticate once
modal deploy main.py  # get permanent URL
```
Copy the output URL: `https://username--syntho-ml-run-job.modal.run`
→ Paste as `MODAL_API_URL` in Render env vars

### 2. Deploy Backend to Render
1. Push code to GitHub
2. Render auto-deploys on push to main branch
3. Verify: `curl https://syntho-api.onrender.com/health`
   Expected: `{"status": "ok", "timestamp": "..."}`
4. Check logs in Render dashboard for startup errors

### 3. Deploy Frontend to Vercel
```bash
cd frontend
vercel --prod
```
Or: push to main branch (auto-deploy if GitHub connected)

### 4. Run Database Migrations
In Supabase SQL Editor, run migrations in order:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage_policies.sql
supabase/migrations/004_triggers.sql
```

### 5. Post-Deploy Verification
```bash
# Test auth flow
open https://syntho.vercel.app/login

# Test API health
curl https://syntho-api.onrender.com/health

# Test Modal endpoint (replace with your secret)
curl -X POST https://username--syntho-ml-run-job.modal.run \
  -H "X-API-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test full upload flow manually
# 1. Login with Google
# 2. Upload a small CSV (< 1000 rows for testing)
# 3. Click Generate → choose SDV
# 4. Verify progress updates in real time
# 5. Verify reports appear after completion
```

---

## Environment Variables — Production Values

### Render (Backend)
Set in Render dashboard → Environment:
```
SUPABASE_URL              = https://xxx.supabase.co
SUPABASE_SERVICE_KEY      = eyJhbGci...  (service_role key, NOT anon)
SUPABASE_JWT_SECRET       = your-jwt-secret
FLUTTERWAVE_SECRET_KEY    = FLWSECK_LIVE-xxx
FLUTTERWAVE_WEBHOOK_HASH  = your-webhook-hash
MODAL_API_URL             = https://username--syntho-ml-run-job.modal.run
MODAL_API_SECRET          = 64-char-random-string
REDIS_URL                 = redis://red-xxx:6379  (Render internal URL)
GROQ_API_KEY              = your-groq-api-key
ENVIRONMENT               = production
```

### Vercel (Frontend)
Set in Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL          = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = eyJhbGci...  (anon key, NOT service_role)
NEXT_PUBLIC_API_URL               = https://syntho-api.onrender.com
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY = FLWPUBK_LIVE-xxx
```

### Modal (modal.com/secrets → syntho-secrets)
```
SUPABASE_URL         = https://xxx.supabase.co
SUPABASE_SERVICE_KEY = eyJhbGci...
MODAL_API_SECRET     = same-64-char-string-as-render
```

---

## Continuous Deployment

### Branch Strategy
```
main      → auto-deploy to production (Vercel + Render)
staging   → deploy to staging environment (optional)
dev       → local development only
```

### Deploy Process
1. Develop on feature branch
2. PR to main → code review
3. Merge to main → auto-deploy triggers
4. Monitor Render logs + Vercel deployment logs
5. Run smoke tests after deploy

---

## Rollback Procedures

### Frontend (Vercel)
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Backend (Render)
1. Go to Render dashboard → syntho-api → Deploys
2. Click on previous successful deploy
3. Click "Redeploy"
4. Wait ~2 minutes for container to restart

### Modal ML
```bash
# Deploy a specific git commit
git checkout [previous-commit-hash]
modal deploy modal_ml/main.py
git checkout main
```

### Database (Supabase)
- Supabase does not support automatic rollback
- For schema changes: write a rollback migration before deploying forward migration
- For data issues: use Supabase's Point-in-Time Recovery (PITR) — available on Pro plan

---

## Monitoring

### What to Watch
| Service | Monitor | Alert Threshold |
|---------|---------|-----------------|
| Render backend | /health endpoint | Down > 2 min |
| Render backend | Response time | > 2000ms average |
| Supabase | DB connections | > 80% of limit |
| Modal | Failed jobs | > 5% failure rate |
| Flutterwave | Webhook failures | Any failure |
| Vercel | Build failures | Any failure |

### UptimeRobot Setup (Free)
1. Create HTTP monitor: `https://syntho-api.onrender.com/health`
2. Check interval: every 5 minutes
3. Alert email: your email
4. This also prevents Render free tier from sleeping

### Log Aggregation
- Render: built-in log viewer (last 500 lines)
- Modal: modal.com/apps → syntho-ml → Logs
- Vercel: vercel.com → project → Functions tab
- Supabase: Dashboard → Logs → API logs

---

## Scaling (When You Need It)

### Render Free → Paid
When free tier (512MB RAM) is insufficient for SDV jobs:
- Upgrade to Render Starter: $7/mo, 512MB–1GB RAM
- Or: Render Standard: $25/mo, 2GB RAM (handles concurrent jobs)

### Supabase Free → Pro
When you hit free tier limits (500MB DB, 1GB storage, 50k MAU):
- Upgrade to Pro: $25/mo
- Adds: 8GB DB, 100GB storage, unlimited MAU, PITR backups

### Modal Credits
Free: $30/mo credits
If exceeded: upgrade to pay-as-you-go
CTGAN T4 GPU: ~$0.30 per full pipeline job
At 100 jobs/month = $30 (exactly covered by free tier)

---

## Domain Setup (Optional)

### Custom Domain on Vercel
1. Vercel dashboard → project → Domains
2. Add: syntho.com (or your domain)
3. Add DNS records as instructed by Vercel
4. SSL: auto-provisioned by Vercel

### Update OAuth After Domain Change
1. Supabase → Authentication → URL Configuration → update Site URL
2. Google Cloud Console → OAuth → update Authorized redirect URIs
3. GitHub → OAuth App → update Homepage URL + Callback URL

---

## Backup Strategy

| Data | Method | Frequency |
|------|--------|-----------|
| Supabase DB | Supabase daily backups (Pro plan) | Daily auto |
| Supabase Storage (datasets) | Download critical files manually | Weekly |
| Code | GitHub (push to main) | Every commit |
| Env vars | Keep local encrypted copy | On any change |

---

## Cost Summary (Production)

| Service | Free Tier Limit | Paid Upgrade |
|---------|----------------|--------------|
| Vercel | 100GB bandwidth | $20/mo (Pro) |
| Render | 512MB RAM, sleeps | $7–25/mo |
| Supabase | 500MB DB, 1GB storage | $25/mo (Pro) |
| Modal.com | $30 credits/mo | Pay per use |
| Flutterwave | — | 1.4% per transaction |
| UptimeRobot | 50 monitors | Free |
| **Total MVP** | **~$0–5/mo** | **~$57–75/mo at scale** |
