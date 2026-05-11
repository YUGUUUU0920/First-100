-- =============================================================================
-- 0005_perf_indexes.sql
-- Performance indexes called out in CEO plan §performance, plus a couple
-- our actual Lane A query shapes now need.  All `if not exists` so safe
-- to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- outreach_events: streak + funnel queries filter by user_id + status, then
-- order by marked_at desc.  The existing (user_id, marked_at desc) index
-- can't push the status predicate, so streak does a Seq Scan over events
-- once events > a few hundred.  Partial index keeps this fast and the
-- index small (only "useful" event types).
-- ---------------------------------------------------------------------------
create index if not exists outreach_events_funnel_idx
  on public.outreach_events(user_id, status, marked_at desc)
  where status in ('sent', 'replied', 'converted');

-- ---------------------------------------------------------------------------
-- scans: jike paste reuses the most recent scan in a 24h window;  the
-- (removed) per-day limit + idempotency window also wanted (user, product,
-- platform, started_at desc).  Even with those guards off in v0, the dashboard
-- never queries scans without user_id + product_id so this composite covers
-- both today's read patterns and tomorrow's rate-limit reintroduction.
-- ---------------------------------------------------------------------------
create index if not exists scans_user_product_platform_started_idx
  on public.scans(user_id, product_id, platform, started_at desc);

-- ---------------------------------------------------------------------------
-- prospects: dashboard sorts by ai_relevance_score desc nulls last, then
-- created_at desc, scoped to a single product (via scan_id join). The
-- existing (user_id, created_at) index forces a sort step after the filter.
-- This covering index removes the sort.
-- ---------------------------------------------------------------------------
create index if not exists prospects_user_score_created_idx
  on public.prospects(user_id, ai_relevance_score desc nulls last, created_at desc);

-- ---------------------------------------------------------------------------
-- outreach_events.features (jsonb) already has a GIN — good for v0.5+ when
-- the ranking model filters by feature subsets.  No change needed here.
-- outreaches.prospect_id has a unique index (from 0001) — covers upsert
-- on conflict and dashboard left-join.  No change needed.
-- =============================================================================
