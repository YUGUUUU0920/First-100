-- =============================================================================
-- 0002_outreach_events_fix.sql
--
-- 0001 的 SQL Editor 执行中，outreach_status enum + outreach_events 表
-- 创建那一段静默失败（其他 4 张表 + 3 个 enum 都 OK）。
-- 此文件只补缺失部分。如果是从空 DB 重跑 0001，本文件不再需要执行
-- （0001 已是完整定义），但保留此文件用于现有项目的状态对齐。
-- =============================================================================

-- 幂等：如果 enum 已存在则跳过
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on t.typnamespace = n.oid
    where t.typname = 'outreach_status' and n.nspname = 'public'
  ) then
    create type public.outreach_status as enum ('sent', 'replied', 'converted', 'skipped');
  end if;
end$$;

create table if not exists public.outreach_events (
  id           uuid primary key default uuid_generate_v4(),
  outreach_id  uuid not null references public.outreaches(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       public.outreach_status not null,
  marked_at    timestamptz not null default now(),
  features     jsonb not null default '{}'::jsonb
);

create index if not exists outreach_events_user_id_marked_at_idx
  on public.outreach_events(user_id, marked_at desc);
create index if not exists outreach_events_outreach_id_idx
  on public.outreach_events(outreach_id);
create index if not exists outreach_events_status_idx
  on public.outreach_events(status);
create index if not exists outreach_events_features_gin
  on public.outreach_events using gin(features);

alter table public.outreach_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'outreach_events'
      and policyname = 'outreach_events_owner_all'
  ) then
    create policy "outreach_events_owner_all" on public.outreach_events
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end$$;
