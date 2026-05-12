"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Outreach, OutreachEvent } from "@/lib/supabase/types";
import { saveOutreachEdit } from "./actions";
import { OutreachActions } from "./_outreach-actions";

interface EditableOutreachProps {
  outreach: Outreach & { outreach_events: OutreachEvent[] };
  prospectId: string;
  initialDraft: string;
  sourceUrl: string;
}

/**
 * Inline-editable outreach card. Founder can tweak the AI draft in place;
 * on blur (or Cmd+S) we silently persist final_chosen so the next visit
 * shows the founder's edit, not the AI's original.
 *
 * Copy button always uses the CURRENT text (whether saved or pending).
 */
export function EditableOutreach({
  outreach,
  prospectId,
  initialDraft,
  sourceUrl,
}: EditableOutreachProps) {
  const [text, setText] = useState(initialDraft);
  const [savedText, setSavedText] = useState(initialDraft);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // When parent re-renders with new initialDraft (e.g., after regenerate),
  // reset local state to match.
  useEffect(() => {
    setText(initialDraft);
    setSavedText(initialDraft);
  }, [initialDraft, outreach.id]);

  // Auto-resize textarea to fit content. Avoids scrollbars on multi-line drafts.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const isDirty = text !== savedText;
  const wasRewritten =
    !!outreach.draft_v2 && outreach.final_chosen === outreach.draft_v2;

  function persist() {
    if (!isDirty || saving) return;
    setSaving(true);
    setError(null);
    startTransition(async () => {
      const result = await saveOutreachEdit(outreach.id, text);
      setSaving(false);
      if (result.ok) {
        setSavedText(text);
      } else {
        setError(result.error);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+S / Ctrl+S — save without leaving the field.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      persist();
    }
  }

  return (
    <div className="card-soft mt-16 rounded-md p-16">
      <div className="flex items-baseline justify-between gap-12">
        <span className="text-meta text-fg-quiet uppercase tracking-wider">
          破冰建议
        </span>
        <span className="text-meta text-fg-quiet tabular-nums">
          <span className="tabular-nums">{text.length}</span> 字
          {typeof outreach.critique_score === "number" && (
            <> · AI 味分 {outreach.critique_score.toFixed(1)}/10</>
          )}
          {wasRewritten && <> · v2</>}
          {isDirty && <> · <span className="text-fg">未保存</span></>}
          {saving && <> · 保存中</>}
        </span>
      </div>

      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={persist}
        onKeyDown={onKeyDown}
        rows={1}
        spellCheck={false}
        className="mt-12 w-full text-body text-fg leading-[1.7] bg-transparent resize-none focus:outline-none border-0 p-0 font-sans"
        style={{ overflow: "hidden" }}
      />

      {error && (
        <p className="mt-8 text-meta text-fg" role="alert">
          保存失败：{error}
        </p>
      )}

      <OutreachActions
        outreach={outreach}
        events={outreach.outreach_events}
        prospectId={prospectId}
        sourceUrl={sourceUrl}
        // Copy must read the LIVE textarea value, not the saved one — founder
        // expects "what I see is what gets copied" even before blur.
        getTextToCopy={() => text}
      />
    </div>
  );
}
