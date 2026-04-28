import type { Prospect } from "@/lib/supabase/types";

interface ProspectListProps {
  prospects: Prospect[];
}

/**
 * Read-only prospect list — copy buttons + status markers come in the next slice.
 *
 * Per DESIGN.md §4 dashboard: rows, not cards. 1px rule between rows.
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
          <li key={p.id} className="rule py-16 first:border-t-0 first:pt-0">
            <ProspectRow prospect={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProspectRow({ prospect }: { prospect: Prospect }) {
  const score = prospect.ai_relevance_score ?? 0;
  const reasonText = stripPromptVersion(prospect.ai_filter_reason);

  return (
    <article className="grid grid-cols-[auto_1fr_auto] gap-16 items-start">
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
        <p className="mt-4 text-meta text-fg-quiet">
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
        <p className="mt-8 text-sub text-fg-muted line-clamp-2 italic">
          {prospect.post_body.slice(0, 160)}
          {prospect.post_body.length > 160 ? "…" : ""}
        </p>
      </div>
    </article>
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
  // Filter reason format is `[<version>] <text>`. Hide the version prefix in UI.
  return raw.replace(/^\[[^\]]+\]\s*/, "");
}
