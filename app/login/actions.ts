"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .email("邮箱格式不对");

const nextSchema = z
  .string()
  .startsWith("/", "non-relative redirect")
  .refine((s) => !s.startsWith("//"), "non-relative redirect");

export type LoginState =
  | { status: "idle" }
  | { status: "ok"; email: string }
  | { status: "error"; message: string };

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Magic links would point to the wrong host."
    );
  }
  return url.replace(/\/$/, "");
}

/**
 * Sends a Supabase magic link to the user's email.
 *
 * Supabase auto-creates the user if they don't exist (signup = login for v0).
 * The magic link redirects to /auth/callback?next=<original-destination> so we
 * can return the user to the page they were trying to reach before login.
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

  const rawNext = formData.get("next");
  const nextParsed = typeof rawNext === "string" ? nextSchema.safeParse(rawNext) : null;
  const next = nextParsed?.success ? nextParsed.data : "/dashboard";

  const callback = new URL(`${getSiteUrl()}/auth/callback`);
  callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message.includes("rate limit")
        ? "短时间内请求过多，等几分钟再试。"
        : `发送失败：${error.message}`,
    };
  }

  return { status: "ok", email };
}
