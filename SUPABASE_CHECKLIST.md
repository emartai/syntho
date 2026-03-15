# Supabase Pre-Launch Checklist

Complete these steps in the Supabase dashboard before deploying.

## Authentication

- [ ] **Email auth enabled** — Authentication → Providers → Email → Enable email confirmations
- [ ] **Google OAuth configured** — Authentication → Providers → Google
  - Add Client ID and Client Secret from Google Cloud Console
  - Add production redirect URL: `https://yourdomain.com/auth/callback`
- [ ] **GitHub OAuth configured** — Authentication → Providers → GitHub
  - Add Client ID and Client Secret from GitHub OAuth App
  - Add production redirect URL: `https://yourdomain.com/auth/callback`
- [ ] **JWT expiry set to 604800** (7 days) — Authentication → Settings → JWT Expiry
- [ ] **Disable email confirm for OAuth users** — Authentication → Settings → uncheck "Confirm email" for OAuth
- [ ] **Enable leaked password protection** — Authentication → Settings → Password Settings
- [ ] **Rate limiting** — enabled by default on Supabase auth endpoints (do not disable)

## Database

- [ ] Run all migrations in order via SQL Editor:
  1. `supabase/migrations/001_initial_schema.sql`
  2. `supabase/migrations/002_rls_policies.sql`
  3. `supabase/migrations/003_storage_policies.sql`
  4. `supabase/migrations/004_freemium_quota.sql`
  5. `supabase/migrations/005_waitlist.sql`
  6. `supabase/migrations/006_indexes.sql`
- [ ] Verify RLS is enabled on all tables:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  ```
  All tables must show `rowsecurity = true`

## Storage

- [ ] Create bucket: `datasets` — set to **PRIVATE**
- [ ] Create bucket: `synthetic` — set to **PRIVATE**
- [ ] Create bucket: `reports` — set to **PRIVATE**
- [ ] Verify no bucket is set to public

## Realtime

- [ ] Enable Realtime ONLY for `synthetic_datasets` table
  — Database → Replication → enable `synthetic_datasets`
- [ ] Do NOT enable Realtime on any other table for MVP

## API Keys (from Settings → API)

Collect these values to fill into `.env.production.example`:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service role key (backend only)
- [ ] `SUPABASE_JWT_SECRET` — JWT secret (Settings → API → JWT Settings)
