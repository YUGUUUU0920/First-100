/**
 * Versioned prompt templates for Claude calls.
 *
 * When a prompt's wording changes meaningfully, BUMP its `*_VERSION` constant.
 * The version string is recorded with each row so we can A/B prompts later:
 *   - prospects.ai_filter_reason  → filter version
 *   - outreaches.draft_v1 / draft_v2  → generate version (in critique_feedback)
 *   - critique_score / critique_feedback  → critique version (in critique_feedback)
 */

export const RELEVANCE_FILTER_VERSION = "filter-v1";
export const OUTREACH_GENERATE_VERSION = "gen-v2";
export const OUTREACH_CRITIQUE_VERSION = "critique-v1";

// AI-味 critique threshold: drafts scoring below this get rewritten once.
export const OUTREACH_CRITIQUE_THRESHOLD = 7;

// Hard ceiling on draft length.  Originally 280 from CEO plan (Twitter
// legacy), but V2EX / 即刻 don't impose that and Sonnet routinely overshoots
// 280 by 10-15% on real Chinese inputs.  320 stays brief enough to force
// the model to be punchy while accepting the natural variance.
export const OUTREACH_MAX_CHARS = 320;

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

// ─────────────────────────────────────────────────────────────────────────
// Outreach generation (Sonnet)
// ─────────────────────────────────────────────────────────────────────────

export interface OutreachGenerationInput {
  productDisplayName: string;
  productDescription: string;
  targetPersona: string;
  postTitle: string | null;
  postBody: string;
  authorHandle: string;
  // Optional rewrite instruction from critique pass.
  critiqueFeedback?: string;
  previousDraft?: string;
}

/**
 * Builds Sonnet prompt for personalized Chinese outreach.
 *
 * Same caching strategy as filter: product context lives in `system` with
 * cache_control. When generating outreach for 5+ prospects in one scan, the
 * 80% input-token discount on cached system kicks in.
 */
export function buildOutreachGenerationMessage(input: OutreachGenerationInput) {
  const {
    productDisplayName,
    productDescription,
    targetPersona,
    postTitle,
    postBody,
    authorHandle,
    critiqueFeedback,
    previousDraft,
  } = input;

  const titleLine = postTitle ? `标题：${postTitle}\n` : "";

  const systemInstruction = [
    "你是一名中文 indie hacker 营销文案。",
    "我会给你一段产品描述，和一条社区帖子（V2EX 或即刻）。",
    "你的任务：为帖子作者写一条**中文破冰回复**，让 ta 看到时点开了解我的产品。",
    "",
    "硬约束（违反任意一条 = 失败）：",
    `  - draft ≤ ${OUTREACH_MAX_CHARS} 个汉字（含标点）。请字数严格控制。`,
    "  - 必须引用帖子里至少一个具体细节（不能泛泛而谈）",
    "  - 不强行嵌入产品链接 / 二维码（提到产品名即可）",
    "  - 不用 AI 万金油词：「赋能」「打造」「全方位」「生态」「闭环」「赛道」",
    "  - 写得像真实 indie 在留言，不是销售机器人",
    "  - 用中文社区的对话感（直接、不啰嗦、自嘲 OK）",
    "  - 不要开头说「您好」或「老哥您好」之类客套",
    "  - rationale ≤ 30 字，一句话",
    "",
    "只回 JSON，不要 markdown，不要前后文字：",
    `{"draft": "<回复文本>", "rationale": "<≤30字解释>"}`,
  ].join("\n");

  const productContext = [
    `产品名：${productDisplayName}`,
    `产品描述：${productDescription}`,
    `目标用户画像：${targetPersona || "（未填）"}`,
  ].join("\n");

  const userParts = [
    `作者：@${authorHandle}`,
    "帖子：",
    titleLine + postBody,
  ];
  if (critiqueFeedback && previousDraft) {
    userParts.push(
      "",
      "你的上一稿：",
      previousDraft,
      "",
      "评审反馈（按这个改）：",
      critiqueFeedback
    );
  }

  return {
    system: [
      { type: "text" as const, text: systemInstruction },
      {
        type: "text" as const,
        text: productContext,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user" as const, content: userParts.join("\n") }],
  };
}

export interface OutreachGenerationOutput {
  draft: string;
  rationale: string;
}

export function parseOutreachGenerationOutput(raw: string): OutreachGenerationOutput | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "draft" in parsed &&
      typeof (parsed as { draft: unknown }).draft === "string"
    ) {
      const { draft, rationale } = parsed as { draft: string; rationale?: unknown };
      return {
        draft: draft.trim(),
        rationale: typeof rationale === "string" ? rationale : "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// AI-味 critique (Haiku)
// ─────────────────────────────────────────────────────────────────────────

export interface OutreachCritiqueInput {
  draft: string;
}

export function buildOutreachCritiqueMessage(input: OutreachCritiqueInput) {
  const systemInstruction = [
    "你是一个中文 AI 味检测员。我会给你一条 indie hacker 写给潜在用户的破冰回复。",
    "请打分 0-10：",
    "  10 = 完全像真实 indie 写的，看不出 AI",
    "  7-9 = 基本自然，有 1-2 处轻微 AI 味",
    "  4-6 = 明显 AI 痕迹（套话、过分客气、冗长、转折太多）",
    "  0-3 = 重度 AI 味（「赋能」「打造」「全方位」「生态」一类词）",
    "",
    "只回 JSON：",
    `{"score": <0-10 数字>, "feedback": "<一句话指出哪里像 AI 味，给一个改写方向>"}`,
  ].join("\n");

  return {
    system: systemInstruction,
    messages: [{ role: "user" as const, content: `回复草稿：\n${input.draft}` }],
  };
}

export interface OutreachCritiqueOutput {
  score: number;
  feedback: string;
}

export function parseOutreachCritiqueOutput(raw: string): OutreachCritiqueOutput | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "score" in parsed &&
      "feedback" in parsed &&
      typeof (parsed as { score: unknown }).score === "number" &&
      typeof (parsed as { feedback: unknown }).feedback === "string"
    ) {
      const { score, feedback } = parsed as { score: number; feedback: string };
      return { score: Math.max(0, Math.min(10, score)), feedback };
    }
    return null;
  } catch {
    return null;
  }
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
