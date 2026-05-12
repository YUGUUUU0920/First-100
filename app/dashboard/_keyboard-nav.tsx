"use client";

import { useEffect, useState } from "react";

/**
 * Dashboard-wide keyboard shortcuts. Mounted once at the bottom of
 * `dashboard/page.tsx` so it's always listening.
 *
 *   j / ↓   focus next prospect row
 *   k / ↑   focus prev prospect row
 *   ⌘/Ctrl+Enter   trigger the focused row's primary action (复制 + 去回帖)
 *   s       same as ⌘+Enter (Gmail muscle memory)
 *   ?       show shortcut help overlay
 *   Esc     close overlay
 *
 * Shortcuts are SUPPRESSED while the user is typing in a textarea / input
 * (so editing an outreach doesn't trigger nav).
 */
export function KeyboardNav() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Always allow Esc to close the help, even if a text field is focused.
      if (e.key === "Escape" && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTextInput =
        tag === "input" || tag === "textarea" || target?.isContentEditable;

      // Special case: Cmd/Ctrl+Enter ships even from inside the outreach textarea.
      // It's the "I'm done editing, send" gesture.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        clickFocusedShip();
        return;
      }

      if (isTextInput) return;

      // ? — show help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // j / ↓ next, k / ↑ prev
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
        return;
      }

      // s — ship focused
      if (e.key === "s") {
        e.preventDefault();
        clickFocusedShip();
        return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showHelp]);

  return showHelp ? <ShortcutsOverlay onClose={() => setShowHelp(false)} /> : null;
}

function getProspectRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-prospect-row]"));
}

function currentFocusedRow(): HTMLElement | null {
  const active = document.activeElement;
  if (!active) return null;
  // The focused element is either a row itself or a descendant of one.
  return (active.closest("[data-prospect-row]") as HTMLElement) ?? null;
}

function moveFocus(delta: 1 | -1) {
  const rows = getProspectRows();
  if (rows.length === 0) return;
  const current = currentFocusedRow();
  const currentIdx = current ? rows.indexOf(current) : -1;
  let nextIdx = currentIdx + delta;
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx > rows.length - 1) nextIdx = rows.length - 1;
  const next = rows[nextIdx];
  if (!next) return;
  next.focus({ preventScroll: false });
  next.scrollIntoView({ block: "center", behavior: "smooth" });
}

function clickFocusedShip() {
  const row = currentFocusedRow();
  if (!row) {
    // No row focused — focus the first one to get the user started.
    const rows = getProspectRows();
    rows[0]?.focus();
    return;
  }
  const shipBtn = row.querySelector<HTMLButtonElement>('button[data-action="ship"]');
  if (shipBtn && !shipBtn.disabled) {
    shipBtn.click();
  }
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/30 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-soft max-w-prose w-full mx-24 p-24 rounded-md bg-bg"
      >
        <h2 className="text-h2 font-semibold text-fg">键盘快捷键</h2>
        <p className="mt-8 text-meta text-fg-quiet">在 dashboard 任何地方按这些键。</p>
        <ul className="mt-24 space-y-12 text-body">
          <Shortcut keys={["j", "↓"]} label="下一个 prospect" />
          <Shortcut keys={["k", "↑"]} label="上一个 prospect" />
          <Shortcut keys={["⌘", "Enter"]} label="复制 + 去回帖 + 标 sent (从任何地方都行，含编辑框里)" />
          <Shortcut keys={["s"]} label="同上 (Gmail 手感)" />
          <Shortcut keys={["?"]} label="开本面板" />
          <Shortcut keys={["Esc"]} label="关闭面板" />
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-32 text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline"
        >
          关闭 (Esc)
        </button>
      </div>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-baseline gap-12">
      <span className="flex gap-4 shrink-0">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="px-8 py-2 text-meta font-mono border border-rule rounded bg-fg/[0.03] text-fg-muted"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-fg-muted">{label}</span>
    </li>
  );
}
