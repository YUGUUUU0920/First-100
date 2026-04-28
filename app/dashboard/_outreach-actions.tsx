"use client";

import { useState, useTransition } from "react";
import { markOutreach } from "./actions";
import type { Outreach, OutreachEvent, OutreachStatus } from "@/lib/supabase/types";

interface OutreachActionsProps {
  outreach: Outreach;
  events: OutreachEvent[];
}

const ALL_STATUSES: { key: OutreachStatus; label: string }[] = [
  { key: "sent", label: "已发送" },
  { key: "replied", label: "已回复" },
  { key: "converted", label: "已转化" },
  { key: "skipped", label: "跳过" },
];

/**
 * 4 status buttons (filled when reached) + a copy button. Each click inserts
 * an outreach_events row via the server action; success triggers
 * router.refresh() implicitly via revalidatePath().
 */
export function OutreachActions({ outreach, events }: OutreachActionsProps) {
  const [, startTransition] = useTransition();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pendingStatus, setPendingStatus] = useState<OutreachStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const draft = outreach.final_chosen ?? outreach.draft_v1;
  const reached = new Set(events.map((e) => e.status));

  async function onCopy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function onMark(status: OutreachStatus) {
    setPendingStatus(status);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await markOutreach(outreach.id, status);
      setPendingStatus(null);
      if (!result.ok) setErrorMsg(result.error);
    });
  }

  return (
    <div className="mt-12 flex flex-wrap items-center gap-8">
      <button
        type="button"
        onClick={onCopy}
        disabled={!draft}
        className="text-meta px-12 py-6 border border-rule rounded-md hover:bg-fg hover:text-bg transition-colors disabled:opacity-50"
      >
        {copyState === "copied"
          ? "✓ 已复制"
          : copyState === "error"
            ? "复制失败"
            : "复制"}
      </button>

      {ALL_STATUSES.map(({ key, label }) => {
        const isReached = reached.has(key);
        const isPending = pendingStatus === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMark(key)}
            disabled={isReached || isPending}
            className={[
              "text-meta px-12 py-6 rounded-md transition-colors",
              isReached
                ? "bg-fg text-bg cursor-default"
                : "border border-rule text-fg-muted hover:bg-fg hover:text-bg",
              isPending && "opacity-60",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isPending ? "..." : isReached ? `✓ ${label}` : label}
          </button>
        );
      })}

      {errorMsg && (
        <span className="text-meta text-fg" role="alert">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
