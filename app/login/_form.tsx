"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  );
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const rawNext = searchParams.get("next") ?? "";
  // Same allowlist as the server action: must be a relative path, not protocol-relative.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const reduce = useReducedMotion();
  const ease = [0.25, 0.1, 0.25, 1] as const;
  const fadeUp = (delayMs: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.05 : 0.6, delay: delayMs / 1000, ease },
  });

  if (state.status === "ok") {
    return (
      <div className="text-center max-w-prose">
        <motion.h1
          {...fadeUp(0)}
          className="text-h1 lg:text-h1-lg font-bold text-fg"
        >
          检查你的邮箱
        </motion.h1>
        <motion.p
          {...fadeUp(120)}
          className="mt-24 text-body lg:text-body-lg text-fg-muted"
        >
          已发送登录链接到{" "}
          <span className="text-fg font-medium">{state.email}</span>
        </motion.p>
        <motion.p
          {...fadeUp(280)}
          className="mt-16 text-sub text-fg-quiet"
        >
          点开邮件里的「登录」链接就能进 dashboard。15 分钟内有效。
        </motion.p>
        <motion.p
          {...fadeUp(440)}
          className="mt-32 text-meta text-fg-quiet"
        >
          没收到？检查垃圾箱，或者{" "}
          <a href="/login" className="underline hover:text-fg">重发一次</a>
        </motion.p>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-headline text-center">
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
        输入邮箱，我们发个一次性登录链接给你。
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
          disabled={pending}
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
        />
      </motion.div>

      {(state.status === "error" || urlError) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-16 text-sub text-fg"
          role="alert"
        >
          {state.status === "error" ? state.message : decodeURIComponent(urlError ?? "")}
        </motion.p>
      )}

      <motion.div {...fadeUp(440)} className="mt-24">
        <Button type="submit" disabled={pending} variant="primary">
          {pending ? "发送中..." : "发送登录链接"}
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
