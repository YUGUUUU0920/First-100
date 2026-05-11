import type { Outreach, OutreachEvent, Prospect } from "@/lib/supabase/types";
import { EditableOutreach } from "./_editable-outreach";
import { RegenerateOnly } from "./_regenerate-only";

// Supabase nests FK relationships as arrays. For 1:1 relationships (unique FK
// on outreaches.prospect_id) we manually take [0].
type OutreachWithEvents = Outreach & { outreach_events: OutreachEvent[] };
export type ProspectWithOutreach = Prospect & {
  outreaches: OutreachWithEvents[];
};

interface ProspectListProps {
  prospects: ProspectWithOutreach[];
}

/**
 * Per DESIGN.md §4 dashboard: rows, not cards. 1px rule between rows.
 *
 * Shows: AI relevance pill, post title (link), author + age + reply count,
 * filter reason, post excerpt, AI-generated outreach draft (the line that
 * matters — it's what the user copies).
 *
 * Copy / sent / replied / converted buttons live in `_outreach-actions.tsx`
 * (next slice).
 */
export function ProspectList({ prospects }: ProspectListProps) {
  if (prospects.length === 0) {
    return (
      <div className="rule pt-32 mt-48">
        <h2 className="text-h2 font-semibold text-fg">Prospects</h2>
        <p className="mt-16 text-body text-fg-muted">
          准备好了？扫一次 V2EX / 掘金，或者粘一条即刻 / 小红书。5 分钟出 30 个潜在用户。
        </p>
      </div>
    );
  }

  return (
    <div className="rule pt-32 mt-48">
      <div className="flex items-baseline justify-between">
        <h2 className="text-h2 font-semibold text-fg">Prospects</h2>
        <span className="text-meta text-fg-quiet">{prospects.length} 条</span>
      </div>
      <ul className="mt-16">
        {prospects.map((p, i) => (
          <li
            key={p.id}
            className="rule py-24 first:border-t-0 first:pt-0 prospect-row"
            // Cap index so a 50-row list doesn't take 2s to fully fade in.
            style={{ "--prospect-i": Math.min(i, 12) } as React.CSSProperties}
          >
            <ProspectRow prospect={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProspectRow({ prospect }: { prospect: ProspectWithOutreach }) {
  const score = prospect.ai_relevance_score ?? 0;
  const reasonText = stripPromptVersion(prospect.ai_filter_reason);
  const outreach = prospect.outreaches[0];
  const prospectId = prospect.id;

  return (
    <article className="grid grid-cols-[auto_1fr] gap-16 items-start">
      <ScorePill score={score} />
      <div className="min-w-0">
        <a
          href={prospect.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-body font-medium text-fg hover:underline underline-offset-4"
        >
          {prospect.post_title ?? "(无标题)"}
        </a>
        <p className="mt-4 text-meta text-fg-quiet tabular-nums">
          @{prospect.author_handle}
          {typeof prospect.post_age_days === "number" && (
            <> · {prospect.post_age_days} 天前</>
          )}
          {typeof prospect.post_reply_count === "number" && (
            <> · {prospect.post_reply_count} 回复</>
          )}
        </p>
        {reasonText && (
          <p className="mt-8 text-sub text-fg-muted line-clamp-2">{reasonText}</p>
        )}
        <p className="mt-8 text-sub text-fg-quiet line-clamp-2 italic">
          {prospect.post_body.slice(0, 160)}
          {prospect.post_body.length > 160 ? "…" : ""}
        </p>

        <OutreachBlock outreach={outreach} prospectId={prospectId} />
      </div>
    </article>
  );
}

function OutreachBlock({
  outreach,
  prospectId,
}: {
  outreach: OutreachWithEvents | undefined;
  prospectId: string;
}) {
  if (!outreach) {
    return (
      <p className="mt-16 text-sub text-fg-quiet">
        没有 outreach（这个 prospect 是旧扫描留下的）
      </p>
    );
  }
  if (outreach.status === "ai_failed") {
    return (
      <div className="mt-16 px-16 py-12 border border-fg/15 rounded-md bg-fg/[0.03]">
        <p className="text-sub text-fg" role="alert">
          AI 没生成成功 — {stripPromptVersion(outreach.critique_feedback) || "未知原因"}
        </p>
        <div className="mt-12">
          <RegenerateOnly prospectId={prospectId} />
        </div>
      </div>
    );
  }
  const draft = outreach.final_chosen ?? outreach.draft_v1;

  return (
    // card-soft = 1px hairline shadow instead of generic border outline.
    // Pulls more weight from typography, less from chrome (per redesign skill).
    <EditableOutreach
      outreach={outreach}
      prospectId={prospectId}
      initialDraft={draft}
    />
  );
}

function ScorePill({ score }: { score: number }) {
  const display = score.toFixed(1);
  const tone =
    score >= 8 ? "text-fg" : score >= 6 ? "text-fg-muted" : "text-fg-quiet";
  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <span className={`text-h2 font-bold tabular-nums ${tone}`}>{display}</span>
      <span className="text-meta text-fg-quiet">/10</span>
    </div>
  );
}

function stripPromptVersion(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/^\[[^\]]+\]\s*/, "");
}
