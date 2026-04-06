# Syntho — Product Roadmap
## Launch → v1 → v2 → v3 → v4

> **Strategy:** Ship the Launch MVP with 20 focused prompts. Collect real user feedback. Expand through v1–v4 as traction grows.
> All future features are planned but not yet coded — the Launch codebase is clean with no dead feature-flagged code.

---

## Launch — Months 1–2
### "It works, it's trustworthy, developers love it"

**What ships at Launch:**
- Google + GitHub OAuth
- Drag-and-drop upload — CSV, JSON, Parquet, Excel up to 500MB
- Auto schema detection — column types, row counts, sample preview
- Two generation engines — CTGAN (Pro/Growth) and Gaussian Copula (all plans)
- Real-time job progress via Supabase Realtime websockets
- **Composite Trust Score — single 0–100 number** (Privacy × 0.40 + Fidelity × 0.40 + Compliance × 0.20)
- PII detection via Microsoft Presidio
- Column-level distribution comparison + correlation validator
- **Downloadable GDPR + HIPAA compliance PDF — foregrounded as the headline deliverable**
- API Keys — REST access for Pro/Growth users (moved from v2 — high retention value, low build cost)
- In-app notifications — job complete, job failed, quota warnings
- Freemium quota — 10 free jobs/month, 10k row cap, Gaussian Copula only on free
- First-time onboarding flow with sample dataset

**Pricing:**

| Plan | Price | Jobs/month | Max rows/job | Methods | API Keys |
|------|-------|-----------|--------------|---------|----------|
| Free | ₦0 | 10 | 10,000 | Gaussian Copula | No |
| Pro | ₦5,000/mo | Unlimited | 500,000 | CTGAN + Gaussian Copula | Yes |
| Growth | ₦15,000/mo | Unlimited | 5,000,000 | All methods + priority GPU | Yes |

**Growth strategy:**
- Post on Nigerian tech communities — Ingressive for Good, She Code Africa Slack, Techpoint Nigeria, Twitter/X
- Reach out to 20 data engineers at fintechs (Flutterwave, Paystack, Kuda, Moniepoint) — free Pro for 3 months in exchange for feedback + testimonial
- Post demo video: upload → generate → download PDF loop — LinkedIn + YouTube
- Write one SEO article: "How to generate synthetic data for GDPR compliance in Nigeria"

**Target:** 200 signups, 15 paying users, ₦75,000 MRR

---

## v1 — Months 3–5
### "Retention, stickiness, and first B2B contracts"

**Features added:**
- Team accounts — invite members, shared datasets, role-based access (Admin / Editor / Viewer)
- Team plan — ₦30,000/mo, 10 seats, shared quota
- Dataset versioning — track multiple generations per dataset, compare versions
- Shareable report links — send compliance PDF URL directly to a client or regulator
- Job history dashboard — full log of all past jobs with re-run button
- Webhook support — ping your endpoint when a job completes (dev retention)
- Basic admin analytics — jobs run, data volume, quota usage per user
- Email notifications — job complete, quota warning, team invite (via Resend or Supabase Edge Functions)
- Improved onboarding — guided 3-step first job with sample dataset, value in under 2 minutes

**New pricing:**

| Plan | Price | Notes |
|------|-------|-------|
| Free | ₦0 | same |
| Pro | ₦5,000/mo | same |
| Growth | ₦15,000/mo | same |
| Team | ₦30,000/mo | 10 seats, shared workspace |

**Growth strategy:**
- Convert the 20 beta fintechs from free Pro → paying Team accounts (personal outreach)
- Write 3 SEO articles: "synthetic data for healthcare Nigeria," "test data generation API," "HIPAA compliant data Nigeria"
- Launch simple affiliate program — data engineers who refer a paying customer get one free Pro month
- Speak at one Nigerian tech event (Data Fest Africa, PyCon Nigeria)
- Begin outreach to Nigerian healthtechs — LifeBank, Helium Health, Kangpe — compliance PDF is the sales wedge

**Target:** 800 signups, 60 paying users, ₦400,000 MRR

---

## v2 — Months 6–9
### "The marketplace opens, developers build on top of Syntho"

**Features added:**
- Marketplace — buy and sell synthetic datasets, Flutterwave checkout, 80/20 revenue split
- Marketplace cold-start — 10 seeded sellers from v1 power users, each with min 3 datasets before launch
- Groq AI layer — schema advisor (fixes column issues before generation), compliance explainer (plain-English PDF summary), natural language dataset search
- AI listing writer — auto-generates title, description, tags from dataset schema
- Admin panel — user management, listing approval queue, platform metrics
- Seller dashboard — revenue, views, downloads, payout history
- Advanced privacy controls — per-column anonymization overrides before generation
- Row scaling — generate datasets larger than the original (up to 10×)
- Batch API — up to 20 generation jobs in one API call
- Split job runners — Gaussian Copula on backend (sync, no GPU cost), Modal GPU for CTGAN only

**New pricing:**
- Free / Pro / Growth / Team — same
- Marketplace take rate: 20% platform fee on all dataset sales

**Growth strategy:**
- Press push — pitch Techpoint, Disrupt Africa, African Business Insider on "Africa's first synthetic data marketplace"
- API integration tutorials for Python, Node.js, R — publish on Dev.to and Hashnode
- Marketplace liquidity campaign — first 50 sellers get 90/10 split for 3 months
- Partnership with Nigerian universities (University of Lagos, Covenant) for research datasets
- Begin enterprise conversations (banks, telcos, insurance) — lead with compliance PDF + team plan

**Target:** 2,500 signups, 180 paying users, marketplace GMV ₦500,000/mo, MRR ₦1,200,000

---

## v3 — Months 10–16
### "Enterprise-ready, Africa-wide, infrastructure hardened"

**Features added:**
- Data connectors — direct ingest from PostgreSQL, S3, BigQuery, MySQL (no manual upload for enterprise)
- Domain-specific CTGAN models — fine-tuned for healthcare (patient records, vitals) and finance (transactions, KYC) — **competitive moat**
- Async batch API — 100+ datasets per call, job queue, status polling, webhook callbacks
- SOC 2 prep — full audit logs, data retention policies, access control records, incident logging
- Public status page — uptime dashboard
- Full test suite — Playwright E2E, pytest >80% coverage, GitHub Actions CI/CD
- Advanced analytics — cohort analysis, MRR dashboard, marketplace health, activation funnel
- Infrastructure upgrade — Render paid, Supabase Pro, Sentry, PostHog, Redis job queue
- Custom compliance templates — NDPR (Nigeria Data Protection Regulation), PDPA (Ghana, Kenya)
- Enterprise plan — custom pricing, SLA guarantee, dedicated GPU, named account manager

**New pricing:**
- Free / Pro / Growth / Team — same
- Enterprise — ₦150,000/mo floor, custom contract

**Growth strategy:**
- Enterprise sales motion — hire or contract one B2B salesperson (banks, telcos, insurance — Nigeria, Ghana, Kenya)
- Pursue 2 anchor enterprise contracts — a mid-size bank and a healthtech — these become case studies
- Conference presence — AfricaCom, FinTech Summit Africa
- "NDPR-ready synthetic data" positioning — no Africa competitor has this
- Full developer portal with live API playground

**Target:** 6,000 signups, 400 paying users, 3 enterprise contracts, MRR ₦5,000,000

---

## v4 — Months 17–24
### "From SaaS to infrastructure layer"

**Features added:**
- On-premise deployment — self-hosted Docker/Kubernetes for enterprises (banks, government, telcos) — Enterprise Plus plan
- Custom model training — enterprises fine-tune CTGAN on their own data, hosted privately
- HIPAA BAA — formal Business Associate Agreement for US-facing healthcare clients (diaspora + global)
- Multi-region deployment — data residency options (Nigeria, EU, US)
- Syntho Embed — white-label SDK for other SaaS products to embed synthetic data generation (new revenue stream)
- ISO 27001 + SOC 2 Type II certification
- Marketplace expansion — international sellers and buyers, USD pricing option
- Advanced model explainability — column-by-column generation reasoning (critical for regulated industries)

**New pricing:**
- Free / Pro / Growth / Team — same
- Enterprise — ₦150,000–₦500,000/mo
- Enterprise Plus (on-prem) — annual contract, ₦3,000,000+/yr
- Embed licensing — per-seat or revenue share

**Growth strategy:**
- International expansion — UK/US Nigerian diaspora tech companies, East Africa (Kenya, Rwanda)
- Partner channel — 2–3 systems integrators who sell Syntho as part of compliance packages
- SOC 2 Type II + ISO 27001 press — newsworthy in B2B, unlocks procurement at large institutions
- Product-led growth (free tier) feeds enterprise pipeline — individual devs champion internally

**Target:** 15,000 signups, 900 paying users, 8 enterprise contracts, MRR ₦15,000,000+

---

## Revenue Summary

| Stage | Timeline | Paying Users | MRR | ARR |
|-------|----------|-------------|-----|-----|
| Launch | Month 1–2 | 15 | ₦75,000 | ₦900,000 |
| v1 | Month 3–5 | 60 | ₦400,000 | ₦4,800,000 |
| v2 | Month 6–9 | 180 + marketplace | ₦1,200,000 | ₦14,400,000 |
| v3 | Month 10–16 | 400 + 3 enterprise | ₦5,000,000 | ₦60,000,000 |
| v4 | Month 17–24 | 900 + 8 enterprise | ₦15,000,000 | ₦180,000,000 |

**Honest notes:**
- Launch and v1 numbers are conservative — achievable with direct outreach execution
- v2 jump depends on marketplace cold-start execution — that's the biggest variable
- v3/v4 numbers require at least 2 enterprise contracts — without enterprise, drop those by 60%
- v4 ₦15M MRR = ~₦6M enterprise + ~₦7M SMB subscriptions + ~₦2M marketplace/embed
- **The single biggest risk is sales, not product.** Everything from v2 onward needs someone actively selling to enterprises. If that's not you, find that person by month 8.
