import Link from "next/link";

type StatusFilter =
  | "all"
  | "not_sent"
  | "awaiting_reply"
  | "replied"
  | "converted";

interface ProspectShape {
  outreaches?: Array<{
    outreach_events?: Array<{ status: string }>;
  }>;
}

/**
 * In-memory status filter — operates on the already-fetched prospects array.
 * Cheap because we cap at 50 rows / page.
 */
export function filterByStatus<T extends ProspectShape>(
  prospects: T[],
  status: StatusFilter
): T[] {
  if (status === "all") return prospects;
  return prospects.filter((p) => {
    const events = p.outreaches?.[0]?.outreach_events ?? [];
    const hasSent = events.some((e) => e.status === "sent");
    const hasReplied = events.some((e) => e.status === "replied");
    const hasConverted = events.some((e) => e.status === "converted");
    switch (status) {
      case "not_sent":
        return !hasSent;
      case "awaiting_reply":
        return hasSent && !hasReplied && !hasConverted;
      case "replied":
        return hasReplied && !hasConverted;
      case "converted":
        return hasConverted;
    }
  });
}

export function countByStatus<T extends ProspectShape>(
  prospects: T[]
): Record<StatusFilter, number> {
  return {
    all: prospects.length,
    not_sent: filterByStatus(prospects, "not_sent").length,
    awaiting_reply: filterByStatus(prospects, "awaiting_reply").length,
    replied: filterByStatus(prospects, "replied").length,
    converted: filterByStatus(prospects, "converted").length,
  };
}

const STATUS_LABELS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "not_sent", label: "未发" },
  { key: "awaiting_reply", label: "等回复" },
  { key: "replied", label: "已回" },
  { key: "converted", label: "已转化" },
];

const MIN_SCORES = [0, 4, 6, 8] as const;

/**
 * Filter bar pinned above the prospects list. Pure server component — each
 * filter is just a <Link> that rewrites the URL params.  Counts are shown
 * inline so the founder sees the dropoff at each stage.
 */
export function ProspectFilterBar({
  productId,
  currentMinScore,
  currentStatus,
  counts,
}: {
  productId: string;
  currentMinScore: number;
  currentStatus: StatusFilter;
  counts: Record<StatusFilter, number> | null;
}) {
  function hrefWith(params: { min_score?: number; status?: StatusFilter }) {
    const sp = new URLSearchParams();
    sp.set("product", productId);
    const ms = params.min_score ?? currentMinScore;
    const st = params.status ?? currentStatus;
    if (ms > 0) sp.set("min_score", String(ms));
    if (st !== "all") sp.set("status", st);
    return `/dashboard?${sp.toString()}`;
  }

  return (
    <div className="rule pt-32 mt-48">
      <div className="flex flex-wrap items-baseline gap-x-24 gap-y-16">
        {/* Score gate */}
        <div className="flex items-baseline gap-8">
          <span className="text-meta text-fg-quiet uppercase tracking-wider">
            分数 ≥
          </span>
          {MIN_SCORES.map((s) => {
            const active = currentMinScore === s;
            return (
              <Link
                key={s}
                href={hrefWith({ min_score: s }) as `/dashboard?${string}`}
                className={`text-meta tabular-nums px-8 py-4 rounded ${
                  active
                    ? "bg-fg text-bg"
                    : "text-fg-muted hover:bg-fg hover:text-bg transition-colors"
                }`}
              >
                {s === 0 ? "0（不限）" : s.toFixed(0)}
              </Link>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-baseline gap-8 flex-wrap">
          <span className="text-meta text-fg-quiet uppercase tracking-wider">
            状态
          </span>
          {STATUS_LABELS.map(({ key, label }) => {
            const active = currentStatus === key;
            const count = counts ? counts[key] : null;
            return (
              <Link
                key={key}
                href={hrefWith({ status: key }) as `/dashboard?${string}`}
                className={`text-meta tabular-nums px-8 py-4 rounded ${
                  active
                    ? "bg-fg text-bg"
                    : "text-fg-muted hover:bg-fg hover:text-bg transition-colors"
                }`}
              >
                {label}
                {count !== null && (
                  <span className={active ? "ml-4 opacity-70" : "ml-4 text-fg-quiet"}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
