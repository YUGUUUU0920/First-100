import type { Outreach, OutreachEvent, Prospect } from "@/lib/supabase/types";
import { OutreachActions } from "./_outreach-actions";

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
          准备好了？点上面按钮扫一次 V2EX。5 分钟出 30 个潜在用户。
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
        {prospects.map((p) => (
          <li key={p.id} className="rule py-24 first:border-t-0 first:pt-0">
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

        <OutreachBlock outreach={outreach} />
      </div>
    </article>
  );
}

function OutreachBlock({ outreach }: { outreach: OutreachWithEvents | undefined }) {
  if (!outreach) {
    return (
      <p className="mt-16 text-sub text-fg-quiet">
        没有 outreach（这个 prospect 是旧扫描留下的）
      </p>
    );
  }
  if (outreach.status === "ai_failed") {
    return (
      <p className="mt-16 text-sub text-fg" role="alert">
        AI 没生成成功 — {stripPromptVersion(outreach.critique_feedback) || "稍后能加重试按钮"}
      </p>
    );
  }
  const draft = outreach.final_chosen ?? outreach.draft_v1;
  const wasRewritten =
    !!outreach.draft_v2 &&
    outreach.final_chosen === outreach.draft_v2;

  return (
    // card-soft = 1px hairline shadow instead of generic border outline.
    // Pulls more weight from typography, less from chrome (per redesign skill).
    <div className="card-soft mt-16 rounded-md p-16">
      <div className="flex items-baseline justify-between gap-12">
        <span className="text-meta text-fg-quiet uppercase tracking-wider">
          破冰建议
        </span>
        <span className="text-meta text-fg-quiet tabular-nums">
          {outreach.char_count} 字
          {typeof outreach.critique_score === "number" && (
            <> · AI 味分 {outreach.critique_score.toFixed(1)}/10</>
          )}
          {wasRewritten && <> · v2</>}
        </span>
      </div>
      <p className="mt-12 text-body text-fg whitespace-pre-wrap leading-[1.7]">
        {draft}
      </p>
      <OutreachActions outreach={outreach} events={outreach.outreach_events} />
    </div>
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
