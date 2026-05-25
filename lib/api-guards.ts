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
