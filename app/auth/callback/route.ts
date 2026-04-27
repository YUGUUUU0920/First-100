import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase magic link callback.
 *
 * Magic link in email points here with ?code=xxx. We exchange the code
 * for a session (Supabase sets the session cookie via the SSR helper),
 * then redirect to the original `next` param or /dashboard.
 *
 * Errors land at /login?error=<reason>.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    const redirect = new URL("/login", url.origin);
    redirect.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirect);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirect = new URL("/login", url.origin);
    redirect.searchParams.set("error", error.message);
    return NextResponse.redirect(redirect);
  }

  // Validate `next` is a safe relative path (avoid open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
