import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The 5 SQL dashboards from CEO plan §observability. Pulled together so
 * /admin can render them in parallel. Every helper returns a plain shape
 * (no Supabase types leak into the page).
 */

// 1. Per-user 7d scan count + cumulative token cost.
export async function getUsageByUser(admin: SupabaseClient): Promise<
  Array<{
    user_id: string;
    scans_7d: number;
    cost_cents_7d: number;
    last_scan_at: string | null;
  }>
> {
  const sevenDaysAgoISO = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await admin
    .from("scans")
    .select("user_id, cost_cents, started_at")
    .gte("started_at", sevenDaysAgoISO);
  if (!data) return [];

  const acc = new Map<
    string,
    { scans_7d: number; cost_cents_7d: number; last_scan_at: string | null }
  >();
  for (const row of data) {
    const u = (row as { user_id: string }).user_id;
    const cur = acc.get(u) ?? { scans_7d: 0, cost_cents_7d: 0, last_scan_at: null };
    cur.scans_7d += 1;
    cur.cost_cents_7d += (row as { cost_cents: number | null }).cost_cents ?? 0;
    const started = (row as { started_at: string }).started_at;
    if (!cur.last_scan_at || started > cur.last_scan_at) cur.last_scan_at = started;
    acc.set(u, cur);
  }
  return Array.from(acc.entries())
    .map(([user_id, v]) => ({ user_id, ...v }))
    .sort((a, b) => b.scans_7d - a.scans_7d);
}

// 2. Weekly scan partial-failure rate (ai_failed / total outreaches in current week).
export async function getPartialFailureRate(admin: SupabaseClient): Promise<{
  total: number;
  ai_failed: number;
  rate: number;
}> {
  const sevenDaysAgoISO = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count: totalCount } = await admin
    .from("outreaches")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgoISO);
  const { count: failedCount } = await admin
    .from("outreaches")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgoISO)
    .eq("status", "ai_failed");
  const total = totalCount ?? 0;
  const ai_failed = failedCount ?? 0;
  return { total, ai_failed, rate: total === 0 ? 0 : ai_failed / total };
}

// 3. Activation funnel: signup → first scan → first sent → first replied → first poster.
export async function getActivationFunnel(admin: SupabaseClient): Promise<{
  signups: number;
  created_product: number;
  ran_first_scan: number;
  first_sent: number;
  first_replied: number;
}> {
  // Distinct user_ids at each stage.  Done via 5 cheap COUNT-distinct queries
  // (the alternative — a giant left-join — costs more on small tables).
  // auth.users isn't directly queryable via PostgREST, so we approximate
  // "signups" as "distinct user_id ever seen in products". Close enough for
  // v0 because every signup is prompted to create a product on first login.
  const sets = await Promise.all([
    admin
      .from("products")
      .select("user_id", { count: "exact", head: false })
      .limit(10_000),
    admin
      .from("scans")
      .select("user_id")
      .limit(10_000),
    admin
      .from("outreach_events")
      .select("user_id")
      .eq("status", "sent")
      .limit(10_000),
    admin
      .from("outreach_events")
      .select("user_id")
      .eq("status", "replied")
      .limit(10_000),
  ]);
  const distinctSets = sets.map(
    (r) => new Set((r.data ?? []).map((d) => (d as { user_id: string }).user_id))
  );
  // Guaranteed length 4 from the Promise.all input above; cast away the
  // possibly-undefined that strict array indexing flags.
  const products = distinctSets[0] as Set<string>;
  const scans = distinctSets[1] as Set<string>;
  const sent = distinctSets[2] as Set<string>;
  const replied = distinctSets[3] as Set<string>;
  return {
    signups: products.size, // approximated — see comment above
    created_product: products.size,
    ran_first_scan: scans.size,
    first_sent: sent.size,
    first_replied: replied.size,
  };
}

// 4. Weekly cron success rate — we don't have a cron_runs table yet, so this
//    reports the most recent posters per user as a proxy.
export async function getRecentPosters(admin: SupabaseClient): Promise<
  Array<{ user_id: string; iso_week: string; size_kb: number; created_at: string }>
> {
  // Storage doesn't expose `list` over PostgREST cleanly; use the storage API.
  const { data, error } = await admin.storage
    .from("posters")
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];

  // `list("")` returns top-level entries (folder names = user_id). Drill one
  // level into the most active users.
  const rows: Array<{
    user_id: string;
    iso_week: string;
    size_kb: number;
    created_at: string;
  }> = [];
  for (const folder of data.slice(0, 5)) {
    if (!folder.id || !folder.name) continue;
    const { data: weeks } = await admin.storage
      .from("posters")
      .list(folder.name, {
        limit: 8,
        sortBy: { column: "created_at", order: "desc" },
      });
    for (const w of weeks ?? []) {
      rows.push({
        user_id: folder.name,
        iso_week: w.name.replace(/\.png$/i, ""),
        size_kb: Math.round((w.metadata?.size ?? 0) / 1024),
        created_at: w.created_at ?? "",
      });
    }
  }
  return rows;
}

// 5. Email deliverability — we'd need a Resend webhook table to track real
//    delivered/bounced/complaint events. For v0 we just count auth.users
//    indirectly via `products` last_login proxy. Marked TODO until the
//    Resend webhook lands.
export async function getEmailDeliverability(_admin: SupabaseClient): Promise<{
  delivered: number;
  bounced: number;
  complained: number;
  note: string;
}> {
  return {
    delivered: 0,
    bounced: 0,
    complained: 0,
    note: "Wire up Resend webhook → email_events table (CEO plan §observability #5). v0 placeholder.",
  };
}
