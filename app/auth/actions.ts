"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out the current session and bounce to the landing page.
 *
 * Server Action (not a route handler) so Next.js applies its built-in CSRF
 * protection: cross-origin form posts to a Server Action are rejected by the
 * runtime via the Origin / Sec-Fetch-Site headers it injects.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
