"use client";

import { useState } from "react";
import { PasteForm } from "./_paste-form";

type PasteSource = "jike-pasted" | "xhs-pasted";

const TABS: { key: PasteSource; label: string }[] = [
  { key: "jike-pasted", label: "即刻" },
  { key: "xhs-pasted", label: "小红书" },
];

/**
 * Wraps both PasteForms in a single tabbed section so the dashboard isn't
 * cluttered with two visually-identical forms. UX win: "looks like one feature
 * with platform switching," not "duplicate forms — am I going crazy?"
 *
 * Default tab = 即刻 (more common for Chinese indie founders' target user).
 */
export function PasteSection({ productId }: { productId: string }) {
  const [active, setActive] = useState<PasteSource>("jike-pasted");

  return (
    <div className="rule pt-32 mt-48">
      <h2 className="text-h2 font-semibold text-fg">或者，自己粘一条帖子</h2>
      <p className="mt-12 text-sub text-fg-muted">
        即刻 / 小红书没有公开 API，只能你手动复制贴过来。AI 立刻给你写一句中文破冰话术。
      </p>

      <div className="mt-20 inline-flex border border-rule rounded-md overflow-hidden">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={[
                "text-sub px-16 py-8 transition-colors",
                isActive ? "bg-fg text-bg" : "text-fg-muted hover:bg-fg/[0.06]",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/*
        Key remounts on tab change — this drops the form state (textarea value,
        action result) between platforms. Intentional: pasting the wrong
        platform's content into the other's form is a UX trap. Clean slate
        per tab is safer.
      */}
      <div className="mt-16">
        <PasteForm key={active} productId={productId} platform={active} embedded />
      </div>
    </div>
  );
}
