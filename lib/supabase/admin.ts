import { createClient } from "@supabase/supabase-js";

/**
 * Server-side admin client using the SUPABASE_SECRET_KEY (formerly service_role).
 * Bypasses RLS — only callable from server code.
 *
 * Why this exists:
 *   The publishable-key + cookie SSR pattern is supposed to forward the user's
 *   JWT to PostgREST so RLS sees `auth.uid() = user_id`. In practice with
 *   @supabase/ssr 0.10 + sb_publishable_* keys + Server Actions, the JWT
 *   sometimes does not reach PostgREST and `auth.uid()` is NULL → every RLS
 *   `with check (auth.uid() = user_id)` blocks the insert.
 *
 *   Rather than fight the SDK forwarding for v0, we use the admin client for
 *   server-side writes and explicitly set `user_id` from the result of
 *   `getUser()`. RLS still protects reads (we use the publishable client +
 *   cookies for those).
 *
 * Rule: NEVER expose this client to a route that takes user-controlled
 * `user_id` from the request. Always derive user_id from `getUser()`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env."
    );
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
