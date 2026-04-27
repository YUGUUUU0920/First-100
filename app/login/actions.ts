"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .email("邮箱格式不对");

export type LoginState =
  | { status: "idle" }
  | { status: "ok"; email: string }
  | { status: "error"; message: string };

/**
 * Sends a Supabase magic link to the user's email.
 * Triggered by the login form (client component) via React 19 useActionState.
 *
 * Supabase auto-creates the user if they don't exist (signup = login for v0).
 * The magic link redirects to /auth/callback (configured in Supabase URL Configuration).
 */
export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = formData.get("email");
  if (typeof raw !== "string") {
    return { status: "error", message: "提交格式不对" };
  }

  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "邮箱无效" };
  }
  const email = parsed.data;

  const supabase = await createClient();
  // The redirectTo must match an entry in Supabase URL Configuration.
  // In dev: http://localhost:3000/auth/callback. In prod: set NEXT_PUBLIC_SITE_URL.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Common: rate limit (4/hour per email by default), invalid email, SMTP misconfig
    return {
      status: "error",
      message: error.message.includes("rate limit")
        ? "短时间内请求过多，等几分钟再试。"
        : `发送失败：${error.message}`,
    };
  }

  return { status: "ok", email };
}
