"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { pastedProspect, type PasteResult } from "./actions";

interface PasteFormProps {
  productId: string;
  platform: "jike-pasted" | "xhs-pasted";
}

const initialState: PasteResult | null = null;

const PLATFORM_COPY: Record<
  PasteFormProps["platform"],
  {
    heading: string;
    blurb: string;
    bodyPlaceholder: string;
    authorPlaceholder: string;
    urlPlaceholder: string;
  }
> = {
  "jike-pasted": {
    heading: "即刻粘贴",
    blurb: "即刻里长按一条帖子 → 复制 → 粘到这里。AI 立刻给你写一条破冰回复。",
    bodyPlaceholder: "把即刻帖子正文粘这里...",
    authorPlaceholder: "@xxx",
    urlPlaceholder: "https://web.okjike.com/originalPost/...",
  },
  "xhs-pasted": {
    heading: "小红书粘贴",
    blurb:
      "小红书 app 里点笔记右上 ⋯ → 复制链接 + 笔记文字 → 粘到这里。AI 立刻给你写一条破冰回复。",
    bodyPlaceholder: "把小红书笔记正文 + 标题粘这里...",
    authorPlaceholder: "@小红书账号名",
    urlPlaceholder: "https://www.xiaohongshu.com/explore/...",
  },
};

/**
 * Generic paste form for platforms without a scrape-able API (即刻 / 小红书).
 * Same UX shape, different copy. The platform discriminator goes to the
 * server action so prospects land with the correct source_platform.
 */
export function PasteForm({ productId, platform }: PasteFormProps) {
  const [state, formAction, pending] = useActionState(pastedProspect, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const copy = PLATFORM_COPY[platform];

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const errorFor = (field: string) =>
    state && !state.ok && state.field === field ? state.error : null;
  const generalError = state && !state.ok && !state.field ? state.error : null;

  return (
    <form ref={formRef} action={formAction} className="rule pt-32 mt-48">
      <h2 className="text-h2 font-semibold text-fg">{copy.heading}</h2>
      <p className="mt-12 text-sub text-fg-muted">{copy.blurb}</p>

      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="platform" value={platform} />

      <div className="mt-24">
        <label htmlFor={`body-${platform}`} className="block text-sub text-fg-muted mb-8">
          帖子正文
        </label>
        <textarea
          id={`body-${platform}`}
          name="body"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          disabled={pending}
          placeholder={copy.bodyPlaceholder}
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
          <label
            htmlFor={`author-${platform}`}
            className="block text-sub text-fg-muted mb-8"
          >
            作者昵称
          </label>
          <input
            id={`author-${platform}`}
            name="author_handle"
            type="text"
            required
            maxLength={80}
            disabled={pending}
            placeholder={copy.authorPlaceholder}
            className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50"
          />
          {errorFor("author_handle") && (
            <p className="mt-8 text-sub text-fg" role="alert">
              {errorFor("author_handle")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`url-${platform}`} className="block text-sub text-fg-muted mb-8">
            原帖链接（可选）
          </label>
          <input
            id={`url-${platform}`}
            name="source_url"
            type="url"
            maxLength={300}
            disabled={pending}
            placeholder={copy.urlPlaceholder}
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
          ✓ 已加进潜在用户列表
          {state.outreach_status === "ai_failed" && "（AI 写破冰话术没成功，但人已经记录了；可以点列表里的「重写」按钮重试）"}
        </p>
      )}

      <div className="mt-24">
        <Button type="submit" disabled={pending} variant="primary">
          {pending ? "AI 写破冰话术中..." : "加到列表 + AI 写破冰话术"}
        </Button>
      </div>
    </form>
  );
}
