import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh Supabase session on every request + gate /dashboard behind auth.
 *
 * Pattern from official Supabase SSR docs: we MUST construct the client
 * here (not import from ./server.ts) because middleware needs request +
 * response cookie objects, not next/headers cookies().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Misconfigured env — fail loud in dev, fall through in prod (don't break public routes).
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Parameters<typeof response.cookies.set>[2] }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() refreshes the auth token. Don't remove this line —
  // without it, the session cookie won't refresh and users will get logged
  // out unexpectedly.
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes: any path under these prefixes requires a logged-in user.
  const path = request.nextUrl.pathname;
  const protectedPrefixes = ["/dashboard", "/products"];
  const isProtected = protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  // Bounce already-logged-in users away from /login (no point staring at it).
  if (path === "/login" && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}
