/**
 * Versioned prompt templates for Claude calls.
 *
 * When a prompt's wording changes meaningfully, BUMP its `*_VERSION` constant.
 * The version string is recorded in:
 *   - prospects.ai_filter_reason (filter outputs reference filter version)
 *   - outreach_events.features.generate_prompt_version (outreach gen version)
 * so future analysis can A/B prompts against historical data.
 */

export const RELEVANCE_FILTER_VERSION = "filter-v1";

export interface RelevanceFilterInput {
  productDescription: string;
  targetPersona: string;
  postTitle: string | null;
  postBody: string;
}

/**
 * Builds system + user content for the relevance filter (Haiku).
 *
 * The product description + persona go in `system` with `cache_control:
 * ephemeral` because we call this in parallel for every prospect in a scan
 * (typically 30+) — caching the static portion drops cost ~80%.
 */
export function buildRelevanceFilterMessage(input: RelevanceFilterInput) {
  const { productDescription, targetPersona, postTitle, postBody } = input;
  const titleLine = postTitle ? `标题：${postTitle}\n` : "";

  const systemInstruction = [
    "你是一名 indie hacker 营销分析师。",
    "我会给你一段产品描述、一段目标用户画像、和一条社区帖子（来自 V2EX 或即刻）。",
    "你的任务：判断这条帖子的作者是不是「正在讨论这个产品能解决的问题」的潜在用户。",
    "评分规则 0-10：",
    "  10 = 作者明确在抱怨产品能解决的痛点，是高质量 lead",
    "  7-9 = 高度相关，作者在讨论相邻话题",
    "  4-6 = 弱相关，作者可能感兴趣",
    "  0-3 = 不相关，跳过",
    "",
    "重要：只回 JSON，不要 markdown，不要前后文字。",
    `格式：{"score": <0-10 的数字>, "reason": "<一句话中文，解释为什么打这个分>"}`,
  ].join("\n");

  const productContext = [
    `产品描述：${productDescription}`,
    `目标用户画像：${targetPersona || "（未填）"}`,
  ].join("\n");

  const userContent = `帖子：\n${titleLine}${postBody}`;

  return {
    system: [
      { type: "text" as const, text: systemInstruction },
      {
        type: "text" as const,
        text: productContext,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user" as const, content: userContent }],
  };
}

export interface RelevanceFilterOutput {
  score: number;
  reason: string;
}

/**
 * Parses Haiku's JSON response. Defensive: returns null on any malformed
 * output so the caller can mark the prospect `ai_failed` and retry.
 */
export function parseRelevanceFilterOutput(raw: string): RelevanceFilterOutput | null {
  const trimmed = raw.trim();
  // Strip markdown fences if the model adds them despite instructions.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "score" in parsed &&
      "reason" in parsed &&
      typeof (parsed as { score: unknown }).score === "number" &&
      typeof (parsed as { reason: unknown }).reason === "string"
    ) {
      const { score, reason } = parsed as { score: number; reason: string };
      // Clamp out-of-range outputs rather than rejecting them.
      const clamped = Math.max(0, Math.min(10, score));
      return { score: clamped, reason };
    }
    return null;
  } catch {
    return null;
  }
}
