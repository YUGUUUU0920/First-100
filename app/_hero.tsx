"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";

/**
 * Landing hero — variant B direction (confident ownership).
 * Motion staggered per DESIGN.md §5: headline → supporting → CTA → metric.
 * Metric numbers count up from 0 once the line scrolls into view (above the
 * fold on most viewports, but the IntersectionObserver guard keeps it
 * correct on small screens where it might land below).
 *
 * Every animation respects `prefers-reduced-motion`.
 */
export function Hero() {
  const reduce = useReducedMotion();
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
        扫 V2EX·掘金·少数派·GitHub 中文榜 · 即刻·小红书可粘贴 · AI 写中文破冰，你按发送
      </motion.p>

      <motion.div {...fadeUp(280)} className="mt-48 lg:mt-64">
        <Link href="/login" aria-label="开始免费内测">
          <Button variant="primary">免费内测</Button>
        </Link>
      </motion.div>

      <motion.p
        {...fadeUp(440)}
        className="mt-48 text-sub lg:text-sub-lg text-fg-quiet tabular-nums"
      >
        平均 <CountUp to={7} reduceMotion={!!reduce} /> 天 ·{" "}
        <CountUp to={23} reduceMotion={!!reduce} /> 条回复 ·{" "}
        <CountUp to={3} reduceMotion={!!reduce} /> 个真实用户
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

/**
 * Counts up from 0 to `to` over 900ms once the element scrolls into view.
 * Uses requestAnimationFrame; no external dep beyond framer-motion (already present).
 *
 * `prefers-reduced-motion`: snap directly to the final value, no animation.
 */
function CountUp({
  to,
  reduceMotion,
  durationMs = 900,
}: {
  to: number;
  reduceMotion: boolean;
  durationMs?: number;
}) {
  const [n, setN] = useState(reduceMotion ? to : 0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setN(to);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const t0 = performance.now();
            const tick = (now: number) => {
              const p = Math.min(1, (now - t0) / durationMs);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.round(to * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        }
      },
      { rootMargin: "0px", threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, reduceMotion, durationMs]);

  return (
    <span ref={ref} className="text-fg-muted">
      {n}
    </span>
  );
}
