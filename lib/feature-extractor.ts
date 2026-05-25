/**
 * Outreach feature extraction — the data flywheel moat.
 *
 * Every time the founder marks an outreach sent/replied/converted, we capture
 * a feature vector describing the outreach + the prospect + the timing. Once
 * enough rows accumulate (~1000), these features train a ranking model so new
 * users get "which kind of outreach actually gets replies" knowledge from day 1.
 *
 * This is the one asset a competitor can't fork by reading the open-source
 * code: the real sent→replied→converted history. See the CEO review
 * (2026-05-12-post-launch-strategic-review.md) Pick #2.
 *
 * Everything here is CHEAP — pure string/date math, no external API. Post-body
 * embeddings (Voyage/Cohere) are deferred until an embedding key is configured;
 * the `embedding` slot is intentionally left for that later upgrade.
 *
 * BUMP FEATURE_SCHEMA_VERSION whenever the shape changes, so training code can
 * filter/migrate by version.
 */

export const FEATURE_SCHEMA_VERSION = 2;

export interface OutreachFeatureInput {
  finalText: string | null;
  draftV1: string;
  wasRewritten: boolean;
  critiqueScore: number | null;
  /** ISO timestamp the outreach row was created (drafted). */
  draftedAt: string | null;
}

export interface ProspectFeatureInput {
  aiRelevanceScore: number | null;
  postScore: number | null;
  postReplyCount: number | null;
  postAgeDays: number | null;
  sourcePlatform: string;
}

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F1FF}]/gu;

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Builds the feature vector stored in outreach_events.features at mark-time.
 * Returns a flat JSON object (GIN-indexable, easy to query for training).
 */
export function extractOutreachFeatures(args: {
  outreach: OutreachFeatureInput;
  prospect: ProspectFeatureInput;
  markedAt?: Date;
}): Record<string, string | number | boolean | null> {
  const { outreach, prospect } = args;
  const markedAt = args.markedAt ?? new Date();
  const text = (outreach.finalText ?? outreach.draftV1 ?? "").trim();

  // Timing signals (UTC — server clock; training can shift to Asia/Shanghai).
  const markedHourUtc = markedAt.getUTCHours();
  const markedDowUtc = markedAt.getUTCDay(); // 0 = Sunday

  let hoursSinceDrafted: number | null = null;
  if (outreach.draftedAt) {
    const drafted = new Date(outreach.draftedAt).getTime();
    if (!Number.isNaN(drafted)) {
      // Clamp to >= 0: markedAt is always after draftedAt in practice, but a
      // clock skew or backfill could produce a negative that would poison the
      // future ranking model. Floor at 0.
      const raw = (markedAt.getTime() - drafted) / 3_600_000;
      hoursSinceDrafted = Math.max(0, Math.round(raw * 100) / 100);
    }
  }

  return {
    v: FEATURE_SCHEMA_VERSION,
    source: "dashboard_button",

    // Outreach text shape (the "what did we say" signals).
    text_len: text.length,
    has_question: /[?？]/.test(text),
    has_url: /https?:\/\//i.test(text),
    // Product-mention markers. ASCII markers need word boundaries (so "tips"
    // doesn't match "ps"); CJK markers are matched as plain substrings because
    // JS \b only fires between \w and non-\w — and CJK chars are non-\w, so a
    // trailing \b after "顺带" never matches when followed by another CJK char.
    // (That bug silently made has_ps=false for every Chinese 顺带/对了 mention.)
    has_ps: /\b(ps|p\.s\.|btw)\b|顺带|顺手|顺便|对了/i.test(text),
    emoji_count: countMatches(text, EMOJI_RE),
    exclam_count: countMatches(text, /[!！]/g),
    has_ellipsis: /(\.{3}|…)/.test(text),
    critique_score: outreach.critiqueScore,
    was_rewritten: outreach.wasRewritten,

    // Prospect quality signals (the "who did we send to" signals).
    prospect_ai_score: prospect.aiRelevanceScore,
    prospect_post_score: prospect.postScore,
    prospect_reply_count: prospect.postReplyCount,
    prospect_age_days: prospect.postAgeDays,
    source_platform: prospect.sourcePlatform,

    // Timing signals (the "when did we act" signals).
    marked_hour_utc: markedHourUtc,
    marked_dow_utc: markedDowUtc,
    hours_since_drafted: hoursSinceDrafted,

    // Reserved for the post-body embedding upgrade (Voyage/Cohere), null for now.
    embedding: null,
  };
}
