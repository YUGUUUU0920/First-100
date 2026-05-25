"use client";

import { useOptimistic, useState, useTransition } from "react";
import { markOutreach, regenerateOutreach } from "./actions";
import type { Outreach, OutreachEvent, OutreachStatus } from "@/lib/supabase/types";

interface OutreachActionsProps {
  outreach: Outreach;
  events: OutreachEvent[];
  prospectId: string;
  /** Where the founder will paste this — opens in a new tab on "去回帖". */
  sourceUrl: string;
  /**
   * Optional getter so the parent (EditableOutreach) can return the live
   * textarea value, not the saved version. Falls back to the AI draft.
   */
  getTextToCopy?: () => string;
}

/** True when the URL is an http(s) link we can actually open (not a fake jike://). */
function isExternalLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// Primary status row — visible by default. These are the ones a founder
// hits in normal workflow.
const PRIMARY_STATUSES: { key: OutreachStatus; label: string }[] = [
  { key: "sent", label: "已发送" },
  { key: "replied", label: "已回复" },
  { key: "converted", label: "已转化" },
];

// Secondary — tucked into the kebab menu. "跳过" is rare; cluttering the
// primary row with it forces the founder's eye past it every time.
const SECONDARY_STATUSES: { key: OutreachStatus; label: string }[] = [
  { key: "skipped", label: "跳过这条" },
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
  sourceUrl,
  getTextToCopy,
}: OutreachActionsProps) {
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
      showToast("已复制 · 去原帖底下粘贴回复", "ok");
    } catch {
      showToast("复制失败 · 浏览器拦了", "err");
    }
  }

  /**
   * The 丝滑 path: one click → copy + open V2EX/掘金/etc tab + optimistic
   * mark sent. Founder pastes & hits reply on the source platform, never
   * needs to return to dashboard to remember marking sent.
   *
   * If the prospect is a paste-source (jike:// / xhs://), there's no real
   * URL to open — degrade to plain copy.
   */
  async function onShip() {
    const text = getTextToCopy ? getTextToCopy() : (outreach.final_chosen ?? outreach.draft_v1);
    if (!text) return;

    // 1. Copy
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      showToast("复制失败 · 试 Cmd+C", "err");
      return;
    }

    // 2. Open source URL (if it's a real link).
    const hasLink = isExternalLink(sourceUrl);
    if (hasLink) {
      // window.open without await — the popup may be blocked by some browsers
      // if there's no direct user gesture; this onClick handler IS that gesture.
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }

    // 3. Optimistic mark sent.
    setErrorMsg(null);
    startTransition(async () => {
      addOptimisticEvent("sent");
      const result = await markOutreach(outreach.id, "sent");
      if (!result.ok) {
        setErrorMsg(`标「已发送」失败：${result.error}`);
      }
    });

    showToast(
      hasLink ? "已复制 + 标「已发送」 · 原帖在新标签打开了" : "已复制 + 标「已发送」",
      "ok"
    );
    void copied; // satisfy eslint unused
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

  const hasLink = isExternalLink(sourceUrl);
  const isSent = reached.has("sent");

  return (
    <div className="mt-12 flex flex-wrap items-center gap-8 relative">
      {/* Primary action: copy + open + mark sent — the "丝滑" combo */}
      <button
        type="button"
        onClick={onShip}
        disabled={isSent}
        data-action="ship"
        className={[
          "text-meta px-16 py-6 rounded-md transition-all duration-150 font-medium",
          isSent
            ? "bg-fg/[0.05] text-fg-quiet cursor-default"
            : "bg-accent text-accent-fg hover:bg-accent-hover active:scale-[0.97]",
        ].join(" ")}
        title={
          hasLink
            ? "复制 + 打开源贴新 tab + 标 sent (Cmd+Enter)"
            : "复制 + 标 sent (源贴是粘贴来的，无链接可开)"
        }
      >
        {isSent
          ? "✓ 已发送"
          : hasLink
            ? "复制 + 去回帖 ↗"
            : "复制 + 标 sent"}
      </button>

      <button
        type="button"
        onClick={onCopy}
        className="text-meta px-12 py-6 border border-rule rounded-md text-fg-muted hover:bg-fg hover:text-bg transition-colors"
        title="只复制，不标 sent（如果只是想看 / 改）"
      >
        只复制
      </button>

      <span className="text-fg-quiet/40 text-meta select-none" aria-hidden="true">
        |
      </span>

      {/*
        Primary status row — sent / replied / converted. "跳过" + "重写"
        moved into the kebab menu to reduce per-row visual load (was 8
        buttons, now 5 + a menu).
      */}
      {PRIMARY_STATUSES.map(({ key, label }) => {
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

      {/* Kebab: 重写 + 跳过 — secondary actions. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="text-meta px-8 py-6 border border-rule rounded-md text-fg-muted hover:bg-fg hover:text-bg transition-colors leading-none"
          title="更多操作（重写 / 跳过）"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="absolute right-0 mt-4 z-20 min-w-[160px] bg-bg border border-rule rounded-md shadow-md py-4"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRegenerate();
                }}
                disabled={regenerating}
                className="block w-full text-left text-meta px-12 py-8 text-fg-muted hover:bg-fg/[0.06] hover:text-fg transition-colors disabled:opacity-50"
              >
                {regenerating ? "重写中..." : "让 AI 重写"}
              </button>
              {SECONDARY_STATUSES.map(({ key, label }) => {
                const isReached = reached.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onMark(key);
                    }}
                    disabled={isReached}
                    className="block w-full text-left text-meta px-12 py-8 text-fg-muted hover:bg-fg/[0.06] hover:text-fg transition-colors disabled:opacity-50"
                  >
                    {isReached ? `✓ ${label}` : label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

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
