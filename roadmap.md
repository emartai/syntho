# Syntho — Product Roadmap
## MVP → v2 → v3 Launch Stages

> **Strategy:** Build everything in one codebase. Use feature flags to control what is live.
> Ship MVP fast, collect real user feedback, unlock v2 and v3 as you grow.

---

## How Feature Flags Work in This Codebase

In `lib/flags.ts`:
```typescript
export const FLAGS = {
  MARKETPLACE:    process.env.NEXT_PUBLIC_FLAG_MARKETPLACE    === 'true',
  API_KEYS:       process.env.NEXT_PUBLIC_FLAG_API_KEYS       === 'true',
  GROQ_AI:        process.env.NEXT_PUBLIC_FLAG_GROQ_AI        === 'true',
  ADMIN_PANEL:    process.env.NEXT_PUBLIC_FLAG_ADMIN_PANEL    === 'true',
  NOTIFICATIONS:  process.env.NEXT_PUBLIC_FLAG_NOTIFICATIONS  === 'true',
  TEAM_ACCOUNTS:  process.env.NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS  === 'true',
}
```

In Vercel: set env vars per deployment environment.
The code, routes, and DB tables exist at all stages — only UI visibility and API access changes.
Routes behind flags return hard `404` via Next.js `notFound()` — not just hidden in nav.

---

## MVP — Launch Stage
### "Generate safe synthetic data and get compliance reports"
**Target: Ship in 5 weeks. Goal: First 100 users, validate core value prop.**

### What is LIVE in MVP

| Prompt | Module | What Users Get |
|--------|--------|----------------|
| 1 | Scaffold | Working Next.js app, landing page, Plasma Aurora design |
| 2 | Auth | Google + GitHub sign in, profile auto-created |
| 3 | Dashboard | Dashboard shell, sidebar nav, dataset list |
| 4 | Upload UI | Drag-and-drop CSV/JSON/Parquet upload |
| 5 | FastAPI file handling | Backend receives and stores files securely |
| 6 | Schema detection | Column types auto-detected, row/column count shown |
| 7 | Modal.com setup | GPU-backed ML pipeline deployed and running |
| 8 | Gaussian Copula generation | Fast, reliable synthetic generation method |
| 9 | CTGAN + TVAE generation | Advanced generation for complex distributions |
| 10 | Privacy scorer | Privacy score 0–100, PII detection, risk level |
| 11 | Compliance PDF | GDPR + HIPAA compliance report, downloadable PDF |
| 12 | Correlation validator | Statistical fidelity score |
| 13 | Quality report | Full quality report with column-level stats |
| 14 | Realtime progress | Live job progress bar via Supabase Realtime |
| 24 | Error handling | Polished error states, loading skeletons, toasts |
| 25 | Deployment | Live on Vercel + Render + Modal |

### What is HIDDEN in MVP (code exists, flag = false)
- Marketplace (prompts 15–18) → v2
- API Keys (prompts 19–20) → v2
- Groq AI layer (prompt 26) → v2
- Admin panel (prompt 21) → v2
- Team/org accounts → v2
- Dashboard analytics (prompt 22) → v3
- Notifications (prompt 23) → v2

### MVP Freemium Pricing (From Day One)

| Plan | Price | Jobs/month | Max rows/job | Methods | Reports |
|------|-------|-----------|--------------|---------|---------|
| **Free** | ₦0 | 3 jobs | 5,000 rows | Gaussian Copula only | Privacy + Quality |
| **Pro** | ₦5,000/mo | Unlimited | 500,000 rows | All 3 methods | All reports + PDF |
| **Growth** | ₦15,000/mo | Unlimited | 5,000,000 rows | All 3 methods | All reports + priority queue |

**Implementation in MVP:**
- Store `plan` field on `profiles` table: `'free' | 'pro' | 'growth'`
- FastAPI: before starting generation job, check user plan vs usage this month
- If free tier limit hit: return 402 with upgrade prompt
- Payment for Pro/Growth: Flutterwave subscription link (no marketplace needed — just a payment page)
- Free users see a locked badge on CTGAN/TVAE — "Upgrade to Pro to use advanced methods"

### MVP Environment Variables (Vercel)
```
NEXT_PUBLIC_FLAG_MARKETPLACE=false
NEXT_PUBLIC_FLAG_API_KEYS=false
NEXT_PUBLIC_FLAG_GROQ_AI=false
NEXT_PUBLIC_FLAG_ADMIN_PANEL=false
NEXT_PUBLIC_FLAG_NOTIFICATIONS=false
NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS=false
```

### MVP Success Metrics (5 weeks post-launch)
- 100 registered users
- 30% free → Pro conversion
- 50 synthetic datasets generated
- 20 compliance reports downloaded
- Average privacy score > 70
- Zero data breaches or security incidents

---

## v2 — Growth Stage
### "AI-assisted generation + marketplace + developer API + team workspaces"
**Target: 8–12 weeks after MVP. Goal: First marketplace GMV, API adoption, team revenue.**

### What gets UNLOCKED in v2 (flip flags to true)

| Prompt | Module | What Users Get |
|--------|--------|----------------|
| 15 | Marketplace browse | Browse and buy synthetic datasets |
| 16 | Seller side | List datasets, set price, manage listings |
| 17 | Flutterwave checkout | Pay in NGN/GHS/KES, mobile money (MTN, Airtel, M-Pesa) |
| 18 | Split payments | Sellers receive 80%, Syntho takes 20% automatically |
| 19 | API key management | Create, revoke, and scope API keys |
| 20 | Public REST API | Programmatic access: upload, generate, download |
| 21 | Admin panel | User management, listing approval queue, platform metrics |
| 23 | Notifications | In-app + email: job complete, purchase, sale |
| 26 | Groq AI layer | Schema advisor, compliance explainer, listing writer, quality advisor, NL search |
| — | Team accounts | Invite members, shared datasets, role-based access (Owner / Editor / Viewer) |

### v2 Pricing Updates

| Plan | Price | Changes vs MVP |
|------|-------|---------------|
| **Free** | ₦0 | + Can browse marketplace (cannot purchase) |
| **Pro** | ₦5,000/mo | + Marketplace buying + selling + API access (500 calls/day) |
| **Growth** | ₦15,000/mo | + Team seats (up to 3) + higher API limits (5,000 calls/day) |
| **Team** | ₦30,000/mo | Up to 10 seats, shared workspace, admin dashboard |

**Marketplace fee:** 20% platform cut on all sales, auto-split via Flutterwave subaccounts.

### v2 New Infrastructure
- `GROQ_API_KEY` added to Render env vars
- Flutterwave subaccount created per seller on first listing
- Supabase Realtime enabled for `notifications` table
- Rate limiting active on all `/api/v1/` routes (already built in prompt 20)
- Admin panel behind `ADMIN_PANEL` flag — only visible to `role = 'admin'` profiles

### v2 Environment Variables (Vercel)
```
NEXT_PUBLIC_FLAG_MARKETPLACE=true
NEXT_PUBLIC_FLAG_API_KEYS=true
NEXT_PUBLIC_FLAG_GROQ_AI=true
NEXT_PUBLIC_FLAG_ADMIN_PANEL=true
NEXT_PUBLIC_FLAG_NOTIFICATIONS=true
NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS=true
```

### v2 Success Metrics
- ₦500,000 marketplace GMV in first 30 days
- 20 active sellers with approved listings
- 50 API key users
- Groq AI recommendation accepted > 60% of the time
- 10 active team workspaces

---

## v3 — Scale Stage
### "Enterprise-grade platform with full observability and custom infrastructure"
**Target: 6 months after MVP. Goal: Enterprise contracts, 99.9% SLA, custom models.**

### What gets UNLOCKED in v3

| Prompt | Module | What Users Get |
|--------|--------|----------------|
| 22 | Advanced analytics | Cohort analysis, churn, MRR, marketplace health dashboard |
| 27 | Full test suite | Playwright E2E, pytest > 80% coverage, GitHub Actions CI/CD |
| — | Custom models | Fine-tuned CTGAN on domain-specific data (healthcare, finance) |
| — | Batch API | Async bulk generation (100+ datasets in one API call) |
| — | Data connectors | Direct ingest from S3, Google BigQuery, PostgreSQL |
| — | Status page | Public uptime page, incident history |
| — | SOC 2 prep | Audit logs, data retention policies, access controls |

### v3 Pricing

| Plan | Price | Target |
|------|-------|--------|
| **Free** | ₦0 | Individual devs, students |
| **Pro** | ₦5,000/mo | Freelancers, solo founders |
| **Growth** | ₦15,000/mo | Startups, small teams |
| **Team** | ₦30,000/mo | Mid-size companies |
| **Enterprise** | Custom | Large orgs, SLA, invoicing, custom models, dedicated infra |

### v3 Infrastructure Upgrades
- Migrate Render free → Render paid (guaranteed uptime, no cold starts)
- Modal.com paid plan (more GPU hours, faster queues)
- Supabase Pro (increased DB size, connection pooling, PITR backups)
- Add Sentry (error tracking)
- Add PostHog (product analytics, funnel tracking)
- Redis caching for marketplace listing queries

### v3 Success Metrics
- First enterprise contract signed
- 99.9% uptime over 30 days
- MRR > ₦2,000,000
- Test coverage > 80%
- < 2 second p95 API response time

---

## Prompt-to-Stage Master Map

| Prompt | Title | MVP | v2 | v3 |
|--------|-------|:---:|:--:|:--:|
| 1 | Scaffold | ✅ | | |
| 2 | Auth + Supabase | ✅ | | |
| 3 | Layout + Dashboard shell | ✅ | | |
| 4 | Upload UI | ✅ | | |
| 5 | FastAPI file handling | ✅ | | |
| 6 | Schema detection | ✅ | | |
| 7 | Modal.com setup | ✅ | | |
| 8 | Gaussian Copula | ✅ | | |
| 9 | CTGAN + TVAE | ✅ | | |
| 10 | Privacy scorer | ✅ | | |
| 11 | Compliance PDF | ✅ | | |
| 12 | Correlation validator | ✅ | | |
| 13 | Quality report | ✅ | | |
| 14 | Realtime progress | ✅ | | |
| 15 | Marketplace browse | | ✅ | |
| 16 | Seller side | | ✅ | |
| 17 | Flutterwave checkout | | ✅ | |
| 18 | Split payments | | ✅ | |
| 19 | API key management | | ✅ | |
| 20 | Public REST API | | ✅ | |
| 21 | Admin panel | | ✅ | |
| 22 | Advanced analytics | | | ✅ |
| 23 | Notifications | | ✅ | |
| 24 | Error handling | ✅ | | |
| 25 | Deployment | ✅ | | |
| 26 | Groq AI layer | | ✅ | |
| 27 | Full test suite | | | ✅ |

---

## Build Timeline

```
Weeks 1–5    Prompts 1–14, 24, 25         MVP LAUNCH 🚀
             + Freemium paywall logic
             + Flutterwave subscription page (Pro/Growth)

Weeks 6–7    Bug fixes, user feedback, monitoring

Weeks 8–16   Prompts 15–21, 23, 26        v2 LAUNCH 🚀
             + Team accounts module
             + Admin approval workflow

Month 4–6    Prompts 22, 27 + new work     v3 LAUNCH 🚀
             + Enterprise features
             + Infrastructure upgrades
```

---

## Feature Flag Implementation (Full Code)

**`lib/flags.ts`** — central flag definition:
```typescript
export const FLAGS = {
  MARKETPLACE:   process.env.NEXT_PUBLIC_FLAG_MARKETPLACE   === 'true',
  API_KEYS:      process.env.NEXT_PUBLIC_FLAG_API_KEYS      === 'true',
  GROQ_AI:       process.env.NEXT_PUBLIC_FLAG_GROQ_AI       === 'true',
  ADMIN_PANEL:   process.env.NEXT_PUBLIC_FLAG_ADMIN_PANEL   === 'true',
  NOTIFICATIONS: process.env.NEXT_PUBLIC_FLAG_NOTIFICATIONS === 'true',
  TEAM_ACCOUNTS: process.env.NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS === 'true',
}
```

**Sidebar nav** — items filtered by flag:
```typescript
// components/layout/Sidebar.tsx
import { FLAGS } from '@/lib/flags'

const navItems = [
  { label: 'Dashboard',   href: '/dashboard',          show: true },
  { label: 'Datasets',    href: '/datasets',            show: true },
  { label: 'Marketplace', href: '/marketplace',         show: FLAGS.MARKETPLACE },
  { label: 'API Keys',    href: '/settings/api-keys',   show: FLAGS.API_KEYS },
  { label: 'Team',        href: '/settings/team',       show: FLAGS.TEAM_ACCOUNTS },
  { label: 'Admin',       href: '/admin',               show: FLAGS.ADMIN_PANEL },
].filter(item => item.show)
```

**Route protection** — hard 404 for flagged-off pages:
```typescript
// app/(dashboard)/marketplace/page.tsx
import { FLAGS } from '@/lib/flags'
import { notFound } from 'next/navigation'

export default function MarketplacePage() {
  if (!FLAGS.MARKETPLACE) notFound()
  // ... rest of page
}
```

**Backend route protection** — FastAPI dependency:
```python
# backend/app/dependencies/flags.py
from app.config import settings

def require_marketplace():
    if not settings.FLAG_MARKETPLACE:
        raise HTTPException(status_code=404, detail="Not found")

def require_api_keys():
    if not settings.FLAG_API_KEYS:
        raise HTTPException(status_code=404, detail="Not found")

# Usage in router:
# @router.get("/marketplace", dependencies=[Depends(require_marketplace)])
```

**Freemium quota check** — FastAPI dependency for generation:
```python
# backend/app/dependencies/quota.py
async def check_generation_quota(
    current_user: Profile = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.plan == 'free':
        # Count jobs this calendar month
        count = await db.count_jobs_this_month(current_user.id)
        if count >= 3:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "free_limit_reached",
                    "message": "You've used all 3 free jobs this month.",
                    "upgrade_url": "/settings/billing"
                }
            )
```