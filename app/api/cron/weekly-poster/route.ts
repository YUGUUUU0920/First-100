import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderWeeklyPoster } from "@/lib/poster";
import { getStreakWeeks, getWeeklyStats, shanghaiWeekBounds } from "@/lib/weekly-stats";

/**
 * Constant-time compare for the bearer-token check below. Plain `===` short-
 * circuits on the first mismatching byte, which is theoretically exploitable
 * to leak the secret one byte at a time over many requests. Negligible for a
 * 32-byte hex secret, but cheap to do right.
 *
 * Length must match before timingSafeEqual — its own length check throws.
 */
function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

const POSTERS_BUCKET = "posters";

/**
 * POST /api/cron/weekly-poster
 * Auth: `Authorization: Bearer <CRON_SECRET>` header.
 *
 * Triggered by pg_cron every Monday 09:00 Asia/Shanghai (= 01:00 UTC).
 * For every user with at least one `sent` event in the just-ended week,
 * renders + uploads a poster. Idempotent: re-running overwrites.
 *
 * Failures on individual users are logged but don't fail the whole run —
 * one bad user shouldn't block the rest.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: { code: "cron_secret_missing" } },
      { status: 500 }
    );
  }
  if (!safeStringEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const admin = createAdminClient();

  // Compute the just-ended week (so Monday 9am cron generates last week's poster).
  const referenceDate = new Date(Date.now() - 86_400_000); // Yesterday — solidly in last week
  const { iso_week, week_start_utc, week_end_utc } = shanghaiWeekBounds(referenceDate);

  // Find users with sent events in that window.
  const { data: events, error: eventsErr } = await admin
    .from("outreach_events")
    .select("user_id")
    .eq("status", "sent")
    .gte("marked_at", week_start_utc.toISOString())
    .lt("marked_at", week_end_utc.toISOString());
  if (eventsErr) {
    return NextResponse.json(
      { error: { code: "db_error", message: eventsErr.message } },
      { status: 500 }
    );
  }

  const activeUserIds = Array.from(new Set((events ?? []).map((e) => e.user_id)));

  let succeeded = 0;
  const failures: { user_id: string; reason: string }[] = [];

  for (const userId of activeUserIds) {
    try {
      const { data: product } = await admin
        .from("products")
        .select("display_name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!product) {
        failures.push({ user_id: userId, reason: "no product" });
        continue;
      }

      const stats = await getWeeklyStats(admin, userId, referenceDate);
      const streak = await getStreakWeeks(admin, userId, referenceDate);

      const response = await renderWeeklyPoster({
        productDisplayName: product.display_name,
        stats,
        weekIndex: Math.max(1, streak),
      });
      const buffer = await response.arrayBuffer();

      const storagePath = `${userId}/${iso_week}.png`;
      const { error: uploadErr } = await admin.storage
        .from(POSTERS_BUCKET)
        .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
      if (uploadErr) {
        failures.push({ user_id: userId, reason: `upload: ${uploadErr.message}` });
        continue;
      }
      succeeded += 1;
    } catch (err) {
      failures.push({
        user_id: userId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    iso_week,
    succeeded,
    failed: failures.length,
    failures: failures.slice(0, 20), // cap output
  });
}

