"use client";

import { useState, useTransition } from "react";
import { markOutreach, regenerateOutreach } from "./actions";
import type { Outreach, OutreachEvent, OutreachStatus } from "@/lib/supabase/types";

interface OutreachActionsProps {
  outreach: Outreach;
  events: OutreachEvent[];
  prospectId: string;
}

const ALL_STATUSES: { key: OutreachStatus; label: string }[] = [
  { key: "sent", label: "已发送" },
  { key: "replied", label: "已回复" },
  { key: "converted", label: "已转化" },
  { key: "skipped", label: "跳过" },
];

/**
 * Copy + 4 status buttons + 重写 (regenerate). Each action inserts/updates
 * via server action; success triggers revalidatePath() so the dashboard
 * RSC re-renders with new state.
 */
export function OutreachActions({
  outreach,
  events,
  prospectId,
}: OutreachActionsProps) {
  const [, startTransition] = useTransition();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pendingStatus, setPendingStatus] = useState<OutreachStatus | null>(null);
  const [regenerating, setRegenerating] = useState(false);
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

  function onRegenerate() {
    setRegenerating(true);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await regenerateOutreach(prospectId);
      setRegenerating(false);
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

      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        className="text-meta px-12 py-6 border border-rule rounded-md text-fg-muted hover:bg-fg hover:text-bg transition-colors disabled:opacity-50"
        title="不喜欢这个 draft？让 AI 再写一次"
      >
        {regenerating ? "重写中..." : "重写"}
      </button>

      <span className="text-fg-quiet/40 text-meta select-none" aria-hidden="true">
        |
      </span>

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
