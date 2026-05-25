"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { createProduct, type CreateProductState } from "./actions";

const initialState: CreateProductState = { status: "idle" };

const DESCRIPTION_MAX = 500;
const PERSONA_MAX = 200;

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  // Live char counts. Inputs stay uncontrolled (no value prop) so the form
  // action still submits normally — we only read length for the counter.
  const [descLen, setDescLen] = useState(0);
  const [personaLen, setPersonaLen] = useState(0);
  const reduce = useReducedMotion();
  const ease = [0.25, 0.1, 0.25, 1] as const;
  const fadeUp = (delayMs: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.05 : 0.6, delay: delayMs / 1000, ease },
  });

  const errorFor = (field: string) =>
    state.status === "error" && state.field === field ? state.message : null;
  const generalError =
    state.status === "error" && !state.field ? state.message : null;

  return (
    <form action={formAction} noValidate className="w-full max-w-prose">
      <motion.h1
        {...fadeUp(0)}
        className="text-h1 lg:text-h1-lg font-bold text-fg"
      >
        先告诉我你做的是什么
      </motion.h1>
      <motion.p
        {...fadeUp(120)}
        className="mt-16 text-body text-fg-muted"
      >
        AI 用这段描述去判断 V2EX·掘金·少数派·GitHub 中文榜上哪些发帖人可能是你的潜在用户。
        写得越具体，过滤越准。
      </motion.p>

      <motion.div {...fadeUp(240)} className="mt-48">
        <label htmlFor="display_name" className="block text-sub text-fg-muted mb-8">
          产品名（短，会出现在每周战绩海报上）
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={40}
          autoComplete="off"
          autoFocus
          disabled={pending}
          placeholder="比如：First 100"
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
        />
        {errorFor("display_name") && (
          <p className="mt-8 text-sub text-fg" role="alert">
            {errorFor("display_name")}
          </p>
        )}
      </motion.div>

      <motion.div {...fadeUp(320)} className="mt-32">
        <div className="flex items-baseline justify-between mb-8">
          <label htmlFor="description" className="block text-sub text-fg-muted">
            产品描述（越具体，AI 过滤越准）
          </label>
          <span
            className={`text-meta tabular-nums ${
              descLen >= DESCRIPTION_MAX ? "text-fg" : "text-fg-quiet"
            }`}
          >
            {descLen} / {DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="description"
          name="description"
          required
          maxLength={DESCRIPTION_MAX}
          rows={6}
          disabled={pending}
          onChange={(e) => setDescLen(e.target.value.length)}
          placeholder="我做的是一个帮中文 indie hacker 找前 100 个用户的工具。输入产品描述，AI 自动扫 V2EX·掘金·少数派·GitHub 中文榜最近的帖子，过滤出真的在讨论冷启动 / 找不到用户 / 早期分发的人，给每个写一句中文个性化破冰..."
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50 resize-none font-sans"
        />
        {errorFor("description") && (
          <p className="mt-8 text-sub text-fg" role="alert">
            {errorFor("description")}
          </p>
        )}
      </motion.div>

      <motion.div {...fadeUp(400)} className="mt-32">
        <div className="flex items-baseline justify-between mb-8">
          <label htmlFor="target_persona" className="block text-sub text-fg-muted">
            目标用户画像（可空，但填了过滤更准）
          </label>
          <span
            className={`text-meta tabular-nums ${
              personaLen >= PERSONA_MAX ? "text-fg" : "text-fg-quiet"
            }`}
          >
            {personaLen} / {PERSONA_MAX}
          </span>
        </div>
        <textarea
          id="target_persona"
          name="target_persona"
          maxLength={PERSONA_MAX}
          rows={3}
          disabled={pending}
          onChange={(e) => setPersonaLen(e.target.value.length)}
          placeholder="中文 indie hacker，月收入 ¥30-100k，副业写产品，已经在 V2EX / 即刻漂，但不擅长主动接触陌生人..."
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50 resize-none font-sans"
        />
        {errorFor("target_persona") && (
          <p className="mt-8 text-sub text-fg" role="alert">
            {errorFor("target_persona")}
          </p>
        )}
      </motion.div>

      {generalError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-24 text-sub text-fg"
          role="alert"
        >
          {generalError}
        </motion.p>
      )}

      <motion.div {...fadeUp(480)} className="mt-48">
        <Button type="submit" disabled={pending} variant="primary">
          {pending ? "创建中..." : "创建产品"}
        </Button>
      </motion.div>
    </form>
  );
}
