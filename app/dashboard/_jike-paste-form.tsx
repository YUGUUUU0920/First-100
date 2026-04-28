"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { pasteJikeProspect, type PasteResult } from "./actions";

interface JikePasteFormProps {
  productId: string;
}

const initialState: PasteResult | null = null;

/**
 * Long-press a 即刻 post → copy 「正文 + 作者 + 链接」 → paste here.
 *
 * No relevance filter (user already chose to paste, trust them). Outreach is
 * generated inline and the dashboard revalidates on success so the new
 * prospect shows up in the list above.
 */
export function JikePasteForm({ productId }: JikePasteFormProps) {
  const [state, formAction, pending] = useActionState(pasteJikeProspect, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form on success so the next paste is a clean slate.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const errorFor = (field: string) =>
    state && !state.ok && state.field === field ? state.error : null;
  const generalError = state && !state.ok && !state.field ? state.error : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rule pt-32 mt-48"
    >
      <h2 className="text-h2 font-semibold text-fg">即刻粘贴</h2>
      <p className="mt-12 text-sub text-fg-muted">
        即刻里长按一条帖子 → 复制 → 粘到这里。AI 立刻给你写一条破冰回复。
      </p>

      <input type="hidden" name="product_id" value={productId} />

      <div className="mt-24">
        <label htmlFor="body" className="block text-sub text-fg-muted mb-8">
          帖子正文
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          disabled={pending}
          placeholder="把即刻帖子正文粘这里..."
          className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50 resize-none font-sans"
        />
        {errorFor("body") && (
          <p className="mt-8 text-sub text-fg" role="alert">
            {errorFor("body")}
          </p>
        )}
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
        <div>
          <label htmlFor="author_handle" className="block text-sub text-fg-muted mb-8">
            作者昵称
          </label>
          <input
            id="author_handle"
            name="author_handle"
            type="text"
            required
            maxLength={80}
            disabled={pending}
            placeholder="@xxx"
            className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
          />
          {errorFor("author_handle") && (
            <p className="mt-8 text-sub text-fg" role="alert">
              {errorFor("author_handle")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="source_url" className="block text-sub text-fg-muted mb-8">
            原帖链接（可选）
          </label>
          <input
            id="source_url"
            name="source_url"
            type="url"
            maxLength={300}
            disabled={pending}
            placeholder="https://web.okjike.com/originalPost/..."
            className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
          />
          {errorFor("source_url") && (
            <p className="mt-8 text-sub text-fg" role="alert">
              {errorFor("source_url")}
            </p>
          )}
        </div>
      </div>

      {generalError && (
        <p className="mt-16 text-sub text-fg" role="alert">
          {generalError}
        </p>
      )}
      {state?.ok && (
        <p className="mt-16 text-sub text-fg-muted">
          ✓ 已加进列表
          {state.outreach_status === "ai_failed" && "（AI 生成没成功，但 prospect 已存）"}
        </p>
      )}

      <div className="mt-24">
        <Button type="submit" disabled={pending} variant="primary">
          {pending ? "AI 写中..." : "加到列表"}
        </Button>
      </div>
    </form>
  );
}
