"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";

/**
 * Landing hero — variant B direction (confident ownership).
 * Motion staggered per DESIGN.md §5: headline → supporting → CTA → metric
 * Every animation respects prefers-reduced-motion.
 */
export function Hero() {
  const reduce = useReducedMotion();
  // When user prefers reduced motion, flatten all transforms to 0 and shorten duration.
  const ease = [0.25, 0.1, 0.25, 1] as const;
  const fadeUp = (delayMs: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.05 : 0.6, delay: delayMs / 1000, ease },
  });

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-24 py-96 lg:py-128 text-center">
      <motion.h1
        {...fadeUp(0)}
        className="font-sans font-bold text-hero lg:text-hero-lg text-fg max-w-headline tracking-tight"
      >
        你的前 100 个用户，值得你亲手拿下
      </motion.h1>

      <motion.p
        {...fadeUp(120)}
        className="mt-24 lg:mt-32 text-body lg:text-body-lg text-fg-muted max-w-prose"
      >
        即刻 + V2EX 一次扫描 · AI 写个性化破冰 · 你自己按发送
      </motion.p>

      <motion.div {...fadeUp(280)} className="mt-48 lg:mt-64">
        <Button variant="primary" aria-label="开始免费内测">
          免费内测
        </Button>
      </motion.div>

      <motion.p
        {...fadeUp(440)}
        className="mt-48 text-sub lg:text-sub-lg text-fg-quiet"
      >
        平均 7 天 · 23 条回复 · 3 个真实用户
      </motion.p>

      <motion.p
        {...fadeUp(560)}
        className="mt-16 text-meta lg:text-meta-lg text-fg-quiet tracking-wide"
      >
        Your first 100 users, found.
      </motion.p>
    </section>
  );
}
