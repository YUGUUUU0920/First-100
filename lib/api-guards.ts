import { NextResponse } from "next/server";

/**
 * Shared guards for API route handlers (app/api/**).
 *
 * Server Actions get CSRF protection for free via Next.js's built-in
 * Same-Site cookie + Origin checks. Route handlers do NOT — so any
 * POST route that mutates state or spends money needs an explicit guard.
 */

/**
 * CSRF defense-in-depth: reject requests whose Origin / Referer header is not
 * our own site. Same-Site=Lax cookies block most cross-site POSTs, but an
 * explicit origin check closes subdomain / cookie-confusion edge cases.
 *
 * Returns null if the origin is OK (proceed), else a 403 NextResponse.
 *
 * No origin header at all → allow: that's a server-to-server call (cron,
 * health check). All routes using this are also auth-gated, so a missing
 * Origin can't be exploited by an unauthenticated caller.
 */
export function originGuard(request: Request): NextResponse | null {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: { code: "bad_origin" } }, { status: 403 });
  }
  const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost").host;
  if (originHost !== siteHost) {
    return NextResponse.json(
      { error: { code: "bad_origin", message: `origin ${originHost} not allowed` } },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Best-effort in-memory sliding-window rate limit.
 *
 * Use for cheap, idempotent, auth-gated endpoints where a DB-counted limit is
 * overkill (e.g. /api/poster/generate, which overwrites one file per week so
 * the only abuse vector is invocation cost). /api/scan uses a DB row count
 * instead because each scan is expensive and we want a durable limit.
 *
 * LIMITATION: the store is per serverless instance and resets on cold start,
 * so an attacker spread across many cold instances could exceed the limit. It
 * still throttles the common case — a single attacker looping against a warm
 * instance. Upgrade to Upstash/Redis for a durable cross-instance limit once
 * there are paying users (tracked in TODOS as a >50-user item).
 */
const _rateBuckets = new Map<string, number[]>();

export function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (_rateBuckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((hits[0]! + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  hits.push(now);
  _rateBuckets.set(key, hits);

  // Bound memory: when the map grows large, sweep expired entries.
  if (_rateBuckets.size > 5000) {
    for (const [k, v] of _rateBuckets) {
      const fresh = v.filter((t) => t > cutoff);
      if (fresh.length === 0) _rateBuckets.delete(k);
      else _rateBuckets.set(k, fresh);
    }
  }

  return { ok: true };
}
