import type { SupabaseClient } from "@supabase/supabase-js";

export interface WeeklyStats {
  iso_week: string; // "2026-W18"
  week_start_iso: string; // ISO timestamp at Monday 00:00 Asia/Shanghai
  week_end_iso: string; // ISO timestamp at next Monday 00:00 Asia/Shanghai
  sent: number;
  replied: number;
  converted: number;
  skipped: number;
  prospects_added: number;
}

const SHANGHAI_OFFSET_MIN = 480; // UTC+8

/**
 * Returns the Monday-anchored Shanghai-time bounds for a week containing
 * the given date. Default: this week.
 *
 * ISO week label format: "YYYY-Www" e.g. "2026-W18".
 */
export function shanghaiWeekBounds(reference: Date = new Date()): {
  iso_week: string;
  week_start_utc: Date;
  week_end_utc: Date;
} {
  // Convert reference UTC → Shanghai-local time
  const shanghai = new Date(reference.getTime() + SHANGHAI_OFFSET_MIN * 60_000);
  // Roll back to Monday 00:00 in Shanghai time
  const dow = shanghai.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = (dow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const mondayShanghai = new Date(
    Date.UTC(
      shanghai.getUTCFullYear(),
      shanghai.getUTCMonth(),
      shanghai.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0
    )
  );
  // Convert back to UTC by subtracting the offset
  const week_start_utc = new Date(mondayShanghai.getTime() - SHANGHAI_OFFSET_MIN * 60_000);
  const week_end_utc = new Date(week_start_utc.getTime() + 7 * 86_400_000);

  // ISO week numbering (per ISO 8601). We approximate using getUTCFullYear of
  // the Thursday of this week — guards against year boundary edge cases.
  const thursdayShanghai = new Date(mondayShanghai.getTime() + 3 * 86_400_000);
  const year = thursdayShanghai.getUTCFullYear();
  // Week number = ceil((date - first Thursday of year) / 7) + 1
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDow = yearStart.getUTCDay();
  const firstThursdayOffset = (4 - yearStartDow + 7) % 7;
  const firstThursday = new Date(Date.UTC(year, 0, 1 + firstThursdayOffset));
  const weekNum =
    Math.floor((thursdayShanghai.getTime() - firstThursday.getTime()) / (7 * 86_400_000)) + 1;
  const iso_week = `${year}-W${String(weekNum).padStart(2, "0")}`;

  return { iso_week, week_start_utc, week_end_utc };
}

/**
 * Aggregate this week's outreach activity for a single user.
 * Counts each event status; the same outreach can contribute to multiple
 * (e.g., user marks both sent + replied for one prospect).
 */
export async function getWeeklyStats(
  admin: SupabaseClient,
  userId: string,
  reference: Date = new Date()
): Promise<WeeklyStats> {
  const { iso_week, week_start_utc, week_end_utc } = shanghaiWeekBounds(reference);
  const startISO = week_start_utc.toISOString();
  const endISO = week_end_utc.toISOString();

  // Pull events in window in one query, count statuses client-side. Cheaper
  // than 4 separate queries even with the data transfer.
  const { data: events } = await admin
    .from("outreach_events")
    .select("status")
    .eq("user_id", userId)
    .gte("marked_at", startISO)
    .lt("marked_at", endISO);

  let sent = 0;
  let replied = 0;
  let converted = 0;
  let skipped = 0;
  for (const e of events ?? []) {
    if (e.status === "sent") sent += 1;
    else if (e.status === "replied") replied += 1;
    else if (e.status === "converted") converted += 1;
    else if (e.status === "skipped") skipped += 1;
  }

  // Prospects added this week (for "this week's haul" if no events yet).
  const { count: prospectsAdded } = await admin
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lt("created_at", endISO);

  return {
    iso_week,
    week_start_iso: startISO,
    week_end_iso: endISO,
    sent,
    replied,
    converted,
    skipped,
    prospects_added: prospectsAdded ?? 0,
  };
}

/**
 * Streak = consecutive Shanghai-weeks (rolling back from `reference`) with
 * at least one `sent` event for this user. Resets to 0 on the first gap.
 *
 * UI label: "🟢 第 N 周" — used in dashboard nav and weekly poster.
 */
export async function getStreakWeeks(
  admin: SupabaseClient,
  userId: string,
  reference: Date = new Date()
): Promise<number> {
  const { data: events } = await admin
    .from("outreach_events")
    .select("marked_at")
    .eq("user_id", userId)
    .eq("status", "sent")
    .order("marked_at", { ascending: false })
    .limit(500);

  if (!events || events.length === 0) return 0;

  const seenWeeks = new Set<string>();
  for (const ev of events) {
    seenWeeks.add(shanghaiWeekBounds(new Date(ev.marked_at)).iso_week);
  }

  let count = 0;
  let cursor = new Date(reference);
  for (let i = 0; i < 52; i += 1) {
    if (seenWeeks.has(shanghaiWeekBounds(cursor).iso_week)) {
      count += 1;
      cursor = new Date(cursor.getTime() - 7 * 86_400_000);
    } else {
      break;
    }
  }
  return count;
}
