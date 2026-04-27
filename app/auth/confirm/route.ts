import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic link / signup confirmation handler — the PKCE-flow alternative
 * to /auth/callback's `?code=` exchange.
 *
 * Supabase email templates point here with `?token_hash=xxx&type=signup|magiclink`.
 * We call verifyOtp server-side; on success the session cookie is set and
 * we redirect to `next` (default /dashboard).
 *
 * Why this exists: the legacy `?code=` flow uses an OAuth exchange that
 * requires a verifier cookie set by the original signInWithOtp request.
 * That breaks across browsers (user opens email in Outlook desktop,
 * clicks link, browser opens Chrome → no cookie). token_hash flow is
 * stateless on the client side, so cross-device works.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!token_hash || !type) {
    const redirect = new URL("/login", url.origin);
    redirect.searchParams.set("error", "missing_token");
    return NextResponse.redirect(redirect);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    const redirect = new URL("/login", url.origin);
    redirect.searchParams.set(
      "error",
      error.message.includes("expired")
        ? "链接已过期或已被使用，回去重发一次。"
        : error.message
    );
    return NextResponse.redirect(redirect);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
