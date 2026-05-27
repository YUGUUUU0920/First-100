"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { inMemoryRateLimit } from "@/lib/api-guards";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .email("邮箱格式不对");

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "验证码必须是 6 位数字");

const nextSchema = z
  .string()
  .startsWith("/", "non-relative redirect")
  .refine((s) => !s.startsWith("//"), "non-relative redirect");

/**
 * Login flow state — step 1 (send code).
 *
 * `sent` means the email was dispatched; UI flips to verify form.
 * `error` means the send itself failed (validation or Supabase rate limit).
 */
export type SendState =
  | { status: "idle" }
  | { status: "sent"; email: string; next: string }
  | { status: "error"; message: string };

/**
 * Login flow state — step 2 (verify code).
 *
 * Success isn't represented here because the verify action calls `redirect()`
 * which throws and unmounts the form before the state can render.
 */
export type VerifyState =
  | { status: "idle" }
  | { status: "error"; message: string };

// Back-compat type alias — older imports of `LoginState` continue to work.
export type LoginState = SendState;

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Magic link backup would point to the wrong host."
    );
  }
  return url.replace(/\/$/, "");
}

/**
 * Best-effort client IP for rate-limit keying. On Vercel the real client is the
 * first hop in `x-forwarded-for`; the rest are proxies. Returns null locally
 * (no forwarding header) — callers must treat "no IP" as "skip the per-IP gate"
 * rather than blocking, so dev / server-to-server calls aren't penalised.
 */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  return h.get("x-real-ip");
}

/**
 * Step 1: ask Supabase to send a one-time-password (OTP) email.
 *
 * Why we don't rely on the magic link alone:
 * - Chinese email providers (QQ/163/AliyunMail) and WeChat in-app browser
 *   auto-prefetch URLs for anti-phishing scanning. That prefetch BURNS the
 *   one-time token before the human clicks → user sees "expired" / "invalid".
 * - PKCE flow stores the `code_verifier` in cookies, tied to the browser that
 *   initiated the request. Clicking the link in a different app/browser fails.
 * - 6-digit code in the email body is just text, immune to prefetch.
 *
 * We still pass `emailRedirectTo` so Supabase ALSO embeds a magic link as a
 * fallback for users whose email client doesn't prefetch. The email template
 * in Supabase Dashboard must show BOTH the code (`{{ .Token }}`) and the link
 * (`{{ .ConfirmationURL }}`) — see TODOS.md.
 */
export async function sendLoginCode(
  _prev: SendState,
  formData: FormData
): Promise<SendState> {
  const rawEmail = formData.get("email");
  if (typeof rawEmail !== "string") {
    return { status: "error", message: "提交格式不对" };
  }

  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return {
      status: "error",
      message: parsedEmail.error.issues[0]?.message ?? "邮箱无效",
    };
  }
  const email = parsedEmail.data;

  // CSO audit #6 (login lockout): rate-limit BEFORE the Supabase/Resend
  // dispatch so a flood never sends a single email. Two windows:
  //   per-email — caps how often any one address can be bombed (a victim
  //               can't be mailed more than 5×/15min regardless of attacker)
  //   per-IP    — caps a sprayer hitting many distinct addresses from one host
  // In-memory + per serverless instance (see lib/api-guards limitations) —
  // defense-in-depth layered on Supabase's own OTP throttle, not a replacement.
  const perEmail = inMemoryRateLimit(`login:email:${email.toLowerCase()}`, 5, 15 * 60_000);
  if (!perEmail.ok) {
    return {
      status: "error",
      message: `验证码请求太频繁，约 ${Math.ceil(perEmail.retryAfterSec / 60)} 分钟后再试。`,
    };
  }
  const ip = await getClientIp();
  if (ip) {
    const perIp = inMemoryRateLimit(`login:ip:${ip}`, 20, 10 * 60_000);
    if (!perIp.ok) {
      return {
        status: "error",
        message: `请求太频繁，约 ${Math.ceil(perIp.retryAfterSec / 60)} 分钟后再试。`,
      };
    }
  }

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

  return { status: "sent", email, next };
}

// Back-compat alias — `sendMagicLink` used to be the exported name.
export const sendMagicLink = sendLoginCode;

/**
 * Step 2: verify the 6-digit code the user typed.
 *
 * On success, `redirect()` throws Next.js's NEXT_REDIRECT signal — the
 * framework catches it and 303s the client to `next`. The function's stated
 * return type is never reached on success; TypeScript stays happy because
 * `redirect()` is typed as `never`.
 */
export async function verifyLoginCode(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const rawEmail = formData.get("email");
  const rawCode = formData.get("code");
  const rawNext = formData.get("next");

  if (typeof rawEmail !== "string" || typeof rawCode !== "string") {
    return { status: "error", message: "提交格式不对" };
  }

  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { status: "error", message: "邮箱状态异常，重新发送验证码" };
  }

  const parsedCode = codeSchema.safeParse(rawCode);
  if (!parsedCode.success) {
    return {
      status: "error",
      message: parsedCode.error.issues[0]?.message ?? "验证码格式不对",
    };
  }

  const nextParsed = typeof rawNext === "string" ? nextSchema.safeParse(rawNext) : null;
  const next = nextParsed?.success ? nextParsed.data : "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsedEmail.data,
    token: parsedCode.data,
    type: "email",
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const userVisible =
      lower.includes("invalid") || lower.includes("expired") || lower.includes("token")
        ? "验证码错误或已过期。点上方「重发一次」拿新的。"
        : `登录失败：${error.message}`;
    return { status: "error", message: userVisible };
  }

  // `typedRoutes: true` in next.config.ts wants route literals, but `next` is
  // a runtime-validated string allowlisted by `nextSchema`. Cast through the
  // typed-routes shape — this is the documented escape hatch for dynamic
  // post-login destinations.
  redirect(next as Parameters<typeof redirect>[0]);
}
