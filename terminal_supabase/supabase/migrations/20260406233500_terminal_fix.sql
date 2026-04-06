create extension if not exists "uuid-ossp";

create table if not exists public.billing_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro', 'growth')),
  tx_ref text not null unique,
  transaction_id text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  source text not null default 'checkout' check (source in ('checkout', 'webhook')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

drop policy if exists "Users can view own billing events" on public.billing_events;
drop policy if exists "Users can insert own billing events" on public.billing_events;
drop policy if exists "Users can update own billing events" on public.billing_events;

create policy "Users can view own billing events"
  on public.billing_events for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can insert own billing events"
  on public.billing_events for insert
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Users can update own billing events"
  on public.billing_events for update
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create index if not exists idx_billing_events_user_created
  on public.billing_events(user_id, created_at desc);

create index if not exists idx_billing_events_tx_ref
  on public.billing_events(tx_ref);

alter table public.privacy_scores
  add column if not exists singling_out_risk numeric(8,4),
  add column if not exists linkability_risk numeric(8,4);

alter table public.compliance_reports
  add column if not exists gdpr_passed boolean,
  add column if not exists hipaa_passed boolean;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quality_reports_synthetic_dataset_id_key'
  ) then
    alter table public.quality_reports
      add constraint quality_reports_synthetic_dataset_id_key unique (synthetic_dataset_id);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan, jobs_used_this_month)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'free',
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_billing_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_events_set_updated_at on public.billing_events;

create trigger billing_events_set_updated_at
  before update on public.billing_events
  for each row execute function public.touch_billing_events_updated_at();
