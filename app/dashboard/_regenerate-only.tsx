"use client";

import { useState, useTransition } from "react";
import { regenerateOutreach } from "./actions";

/**
 * Single "重新生成" button — used in the ai_failed branch where a full
 * OutreachActions row (copy + status markers) doesn't make sense yet
 * (there's no draft to copy and no event to mark).
 */
export function RegenerateOnly({ prospectId }: { prospectId: string }) {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setBusy(true);
    setError(null);
    startTransition(async () => {
      const result = await regenerateOutreach(prospectId);
      setBusy(false);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-12">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-meta px-12 py-6 border border-rule rounded-md text-fg-muted hover:bg-fg hover:text-bg transition-colors disabled:opacity-50"
      >
        {busy ? "重写中..." : "重新生成"}
      </button>
      {error && (
        <span className="text-meta text-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
