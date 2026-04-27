-- =============================================================================
-- 0001_initial_schema.sql
-- First 100 — v0 schema. Mirrors data model in CEO plan §数据模型.
--
-- Tables: products, scans, prospects, outreaches, outreach_events
-- Auth: relies on auth.users (managed by Supabase Auth).
-- Security: RLS on every table — user_id = auth.uid().
-- =============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- =============================================================================
-- products: a user's product description used for prospect matching
-- =============================================================================
create table public.products (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  display_name    text not null,
  description     text not null,
  target_persona  text not null default '',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index products_user_id_idx on public.products(user_id);

-- =============================================================================
-- scans: a single scan run (V2EX automatic, jike-pasted manual)
-- =============================================================================
create type public.platform as enum ('v2ex', 'jike-pasted');
create type public.scan_trigger as enum ('user', 'cron');

create table public.scans (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  platform        public.platform not null,
  trigger         public.scan_trigger not null default 'user',
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  cost_cents      integer not null default 0,
  prospect_count  integer not null default 0,
  error_message   text
);

create index scans_user_id_started_at_idx on public.scans(user_id, started_at desc);
create index scans_product_id_idx on public.scans(product_id);

-- =============================================================================
-- prospects: candidate users found by a scan (or pasted by user)
-- =============================================================================
create table public.prospects (
  id                  uuid primary key default uuid_generate_v4(),
  scan_id             uuid not null references public.scans(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  source_platform     public.platform not null,
  source_url          text not null,
  author_handle       text not null,
  post_title          text,
  post_body           text not null,
  post_age_days       integer,
  post_score          integer,
  post_reply_count    integer,
  ai_relevance_score  numeric(3,1),  -- 0.0 to 10.0
  ai_filter_reason    text,
  created_at          timestamptz not null default now()
);

create index prospects_scan_id_idx on public.prospects(scan_id);
create index prospects_user_id_created_at_idx on public.prospects(user_id, created_at desc);
create index prospects_source_url_idx on public.prospects(source_url);

-- =============================================================================
-- outreaches: AI-generated outreach drafts attached to prospects
-- =============================================================================
create type public.outreach_draft_status as enum ('pending', 'ok', 'ai_failed');

create table public.outreaches (
  id                uuid primary key default uuid_generate_v4(),
  prospect_id       uuid not null references public.prospects(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  draft_v1          text not null,
  critique_score    numeric(3,1),
  critique_feedback text,
  draft_v2          text,
  final_chosen      text,  -- the version the user actually copied
  char_count        integer not null default 0,
  sonnet_tokens     integer not null default 0,
  haiku_tokens      integer not null default 0,
  status            public.outreach_draft_status not null default 'pending',
  created_at        timestamptz not null default now()
);

create unique index outreaches_prospect_id_unique on public.outreaches(prospect_id);
create index outreaches_user_id_idx on public.outreaches(user_id);

-- =============================================================================
-- outreach_events: data flywheel — sent/replied/converted markings
-- This is the table that, once populated with 1000+ rows, trains the
-- v2 ranking model (CEO plan E2 + DESIGN.md §data flywheel).
-- features (jsonb) stores prospect feature vector at time of marking.
-- =============================================================================
create type public.outreach_status as enum ('sent', 'replied', 'converted', 'skipped');

create table public.outreach_events (
  id           uuid primary key default uuid_generate_v4(),
  outreach_id  uuid not null references public.outreaches(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       public.outreach_status not null,
  marked_at    timestamptz not null default now(),
  features     jsonb not null default '{}'::jsonb
);

create index outreach_events_user_id_marked_at_idx on public.outreach_events(user_id, marked_at desc);
create index outreach_events_outreach_id_idx on public.outreach_events(outreach_id);
create index outreach_events_status_idx on public.outreach_events(status);
-- GIN index on features so we can later query feature subsets for ML training
create index outreach_events_features_gin on public.outreach_events using gin(features);

-- =============================================================================
-- updated_at trigger for products (only table with manual updates)
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- =============================================================================
-- Row-Level Security: every row scoped to user_id = auth.uid()
-- =============================================================================
alter table public.products         enable row level security;
alter table public.scans            enable row level security;
alter table public.prospects        enable row level security;
alter table public.outreaches       enable row level security;
alter table public.outreach_events  enable row level security;

-- products: full CRUD by owner
create policy "products_owner_all" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- scans: full CRUD by owner
create policy "scans_owner_all" on public.scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- prospects: full CRUD by owner
create policy "prospects_owner_all" on public.prospects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- outreaches: full CRUD by owner
create policy "outreaches_owner_all" on public.outreaches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- outreach_events: full CRUD by owner
create policy "outreach_events_owner_all" on public.outreach_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Grants: authenticated users can read/write through RLS; anon cannot.
-- =============================================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;  -- RLS still blocks

-- Future tables created in this schema get the same default grants
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
