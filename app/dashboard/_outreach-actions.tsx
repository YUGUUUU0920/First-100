"use client";

import { useOptimistic, useState, useTransition } from "react";
import { markOutreach, regenerateOutreach } from "./actions";
import type { Outreach, OutreachEvent, OutreachStatus } from "@/lib/supabase/types";

interface OutreachActionsProps {
  outreach: Outreach;
  events: OutreachEvent[];
  prospectId: string;
  /**
   * Optional getter so the parent (EditableOutreach) can return the live
   * textarea value, not the saved version. Falls back to the AI draft.
   */
  getTextToCopy?: () => string;
}

const ALL_STATUSES: { key: OutreachStatus; label: string }[] = [
  { key: "sent", label: "已发送" },
  { key: "replied", label: "已回复" },
  { key: "converted", label: "已转化" },
  { key: "skipped", label: "跳过" },
];

/**
 * Copy + 4 status buttons + 重写 (regenerate).
 *
 * Two UX touches per "丝滑" pass:
 *   - useOptimistic on status: the clicked button fills instantly, even
 *     though the server roundtrip + revalidatePath takes 200-400ms
 *   - Toast on copy: a transient floating chip, not a button-text change
 *     (the button doesn't visually shrink/grow as it cycles)
 */
export function OutreachActions({
  outreach,
  events,
  prospectId,
  getTextToCopy,
}: OutreachActionsProps) {
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optimistic: pretend the event is already in the list while the server
  // call is in flight. On error, the next props.events re-render reverts it.
  const [optimisticEvents, addOptimisticEvent] = useOptimistic<
    OutreachEvent[],
    OutreachStatus
  >(events, (current, newStatus) => [
    ...current,
    {
      id: `optimistic-${newStatus}`,
      outreach_id: outreach.id,
      user_id: outreach.user_id,
      status: newStatus,
      marked_at: new Date().toISOString(),
      features: {},
    },
  ]);

  const reached = new Set(optimisticEvents.map((e) => e.status));

  function showToast(message: string, tone: "ok" | "err" = "ok") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 1800);
  }

  async function onCopy() {
    const text = getTextToCopy ? getTextToCopy() : (outreach.final_chosen ?? outreach.draft_v1);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制 · 去贴到 V2EX / 即刻", "ok");
    } catch {
      showToast("复制失败 · 浏览器拦了", "err");
    }
  }

  function onMark(status: OutreachStatus) {
    setErrorMsg(null);
    startTransition(async () => {
      // useOptimistic must be called inside a transition
      addOptimisticEvent(status);
      const result = await markOutreach(outreach.id, status);
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
    <div className="mt-12 flex flex-wrap items-center gap-8 relative">
      <button
        type="button"
        onClick={onCopy}
        className="text-meta px-12 py-6 border border-rule rounded-md hover:bg-fg hover:text-bg transition-colors"
        title="复制 outreach 内容"
      >
        复制
      </button>

      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        className="text-meta px-12 py-6 border border-rule rounded-md text-fg-muted hover:bg-fg hover:text-bg transition-colors disabled:opacity-50"
        title="让 AI 再写一次"
      >
        {regenerating ? "重写中..." : "重写"}
      </button>

      <span className="text-fg-quiet/40 text-meta select-none" aria-hidden="true">
        |
      </span>

      {ALL_STATUSES.map(({ key, label }) => {
        const isReached = reached.has(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMark(key)}
            disabled={isReached}
            className={[
              "text-meta px-12 py-6 rounded-md transition-all duration-150",
              isReached
                ? "bg-fg text-bg cursor-default"
                : "border border-rule text-fg-muted hover:bg-fg hover:text-bg active:scale-[0.97]",
            ].join(" ")}
          >
            {isReached ? `✓ ${label}` : label}
          </button>
        );
      })}

      {errorMsg && (
        <span className="text-meta text-fg" role="alert">
          {errorMsg}
        </span>
      )}

      {/* Toast — absolutely positioned so it doesn't shift button row */}
      {toast && (
        <div
          className={[
            "absolute -top-32 left-0 px-12 py-6 text-meta rounded-md shadow-sm pointer-events-none animate-toast",
            toast.tone === "ok" ? "bg-fg text-bg" : "bg-accent text-accent-fg",
          ].join(" ")}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
