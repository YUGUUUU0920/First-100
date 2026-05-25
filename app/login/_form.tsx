"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import {
  sendLoginCode,
  verifyLoginCode,
  type SendState,
  type VerifyState,
} from "./actions";

const sendInitial: SendState = { status: "idle" };
const verifyInitial: VerifyState = { status: "idle" };

/**
 * Two-step login UI:
 *   1. Email input → server sends OTP → state becomes "sent"
 *   2. 6-digit code input → server verifies → redirect to dashboard
 *
 * Why this shape (and not the simpler magic-link-only flow):
 *   - QQ/163/AliyunMail/WeChat in-app browser all auto-prefetch URLs.
 *     The prefetch consumes the magic-link token before the human clicks.
 *     A 6-digit code in the email body is plain text → immune to prefetch.
 *   - We still tell the user they can click the magic link as backup — both
 *     paths land on the same session.
 *
 * Two separate `useActionState` hooks (one per step) keep the state machine
 * explicit. The verify form is conditionally rendered when `sendState.status`
 * becomes "sent"; it never coexists with the email form.
 */
export function LoginForm() {
  const [sendState, sendAction, sendPending] = useActionState(
    sendLoginCode,
    sendInitial
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyLoginCode,
    verifyInitial
  );

  const codeInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const rawNext = searchParams.get("next") ?? "";
  // Same allowlist as the server: only relative paths, not protocol-relative.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const reduce = useReducedMotion();
  const ease = [0.25, 0.1, 0.25, 1] as const;
  const fadeUp = (delayMs: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.05 : 0.6, delay: delayMs / 1000, ease },
  });

  // Auto-focus the code input the moment we transition to the verify step.
  // Lets users start typing the code without an extra click.
  useEffect(() => {
    if (sendState.status === "sent") {
      codeInputRef.current?.focus();
    }
  }, [sendState.status]);

  // ─── Step 2: code sent, show verify form ────────────────────────────────
  if (sendState.status === "sent") {
    const { email, next: nextFromSend } = sendState;
    const verifyError = verifyState.status === "error" ? verifyState.message : null;

    return (
      <div className="w-full max-w-headline text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-h1 lg:text-h1-lg font-bold text-fg"
        >
          查看你的邮箱
        </motion.h1>
        <motion.p
          {...fadeUp(120)}
          className="mt-24 text-body text-fg-muted"
        >
          6 位验证码发到了{" "}
          <span className="text-fg font-medium">{email}</span>
        </motion.p>

        <form action={verifyAction} className="mt-32">
          <input type="hidden" name="email" value={email} />
          {nextFromSend && (
            <input type="hidden" name="next" value={nextFromSend} />
          )}
          <motion.div {...fadeUp(280)}>
            <label htmlFor="code" className="sr-only">
              6 位验证码
            </label>
            <input
              ref={codeInputRef}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              disabled={verifyPending}
              placeholder="000000"
              className="w-full px-16 py-16 bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet/40 focus:outline-none focus:border-fg transition-colors disabled:opacity-50 text-center tracking-[0.5em] font-mono text-h2"
            />
          </motion.div>

          {verifyError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 text-sub text-fg"
              role="alert"
            >
              {verifyError}
            </motion.p>
          )}

          <motion.div {...fadeUp(440)} className="mt-24">
            <Button type="submit" disabled={verifyPending} variant="primary">
              {verifyPending ? "登录中..." : "确认登录"}
            </Button>
          </motion.div>
        </form>

        <motion.div
          {...fadeUp(600)}
          className="mt-32 text-meta text-fg-quiet"
        >
          没收到？检查垃圾箱，或者{" "}
          {/*
            Resend re-submits sendAction with the SAME email (kept in
            sendState) instead of navigating back to /login — which used to
            wipe the email and force a retype. Critical-path friction since
            国内 email delivery is often slow and resend is common.
          */}
          <form action={sendAction} className="inline">
            <input type="hidden" name="email" value={email} />
            {nextFromSend && <input type="hidden" name="next" value={nextFromSend} />}
            <button
              type="submit"
              disabled={sendPending}
              className="underline hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendPending ? "重发中..." : "重发验证码"}
            </button>
          </form>
        </motion.div>
        <motion.p
          {...fadeUp(680)}
          className="mt-12 text-meta text-fg-quiet"
        >
          也可以直接点邮件里的「登录」链接 — 但部分邮箱（QQ/163/微信内置）会
          自动扫描链接导致失效，建议优先用验证码。
        </motion.p>
      </div>
    );
  }

  // ─── Step 1: idle / error — email form ──────────────────────────────────
  const showError = sendState.status === "error" || urlError;

  return (
    <form
      action={sendAction}
      noValidate
      className="w-full max-w-headline text-center"
    >
      {next && <input type="hidden" name="next" value={next} />}
      <motion.h1
        {...fadeUp(0)}
        className="text-h1 lg:text-h1-lg font-bold text-fg"
      >
        登录 First 100
      </motion.h1>
      <motion.p
        {...fadeUp(120)}
        className="mt-24 text-body text-fg-muted"
      >
        输入邮箱，我们发个 6 位验证码给你。
      </motion.p>

      <motion.div {...fadeUp(280)} className="mt-48">
        <label htmlFor="email" className="sr-only">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          disabled={sendPending}
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
        />
      </motion.div>

      {showError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-16 text-sub text-fg"
          role="alert"
        >
          {sendState.status === "error"
            ? sendState.message
            : decodeURIComponent(urlError ?? "")}
        </motion.p>
      )}

      <motion.div {...fadeUp(440)} className="mt-24">
        <Button type="submit" disabled={sendPending} variant="primary">
          {sendPending ? "发送中..." : "发送验证码"}
        </Button>
      </motion.div>

      <motion.p
        {...fadeUp(600)}
        className="mt-32 text-meta text-fg-quiet"
      >
        没账号？输入邮箱即可，我们自动给你建一个。
      </motion.p>
    </form>
  );
}
