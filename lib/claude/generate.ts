import type Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MAX_TOKENS, HAIKU_MODEL, SONNET_MAX_TOKENS, SONNET_MODEL } from "./index";
import {
  buildOutreachCritiqueMessage,
  buildOutreachGenerationMessage,
  OUTREACH_CRITIQUE_THRESHOLD,
  OUTREACH_CRITIQUE_VERSION,
  OUTREACH_GENERATE_VERSION,
  parseOutreachCritiqueOutput,
  parseOutreachGenerationOutput,
  type OutreachGenerationInput,
} from "./prompts";

export interface FullOutreachResult {
  ok: true;
  draft_v1: string;
  rationale_v1: string;
  critique_score: number;
  critique_feedback: string;
  draft_v2: string | null;
  rationale_v2: string | null;
  final_chosen: string;
  generate_version: string;
  critique_version: string;
  sonnet_input_tokens: number;
  sonnet_output_tokens: number;
  haiku_input_tokens: number;
  haiku_output_tokens: number;
  rewritten: boolean;
}

export interface OutreachFailure {
  ok: false;
  reason: "ai_call_failed" | "ai_unparseable_output";
  detail: string;
  generate_version: string;
}

export type OutreachOutcome = FullOutreachResult | OutreachFailure;

/**
 * Full outreach pipeline for one prospect:
 *   1. Sonnet generates draft_v1
 *   2. Haiku scores draft_v1 for AI-味 (critique pass)
 *   3. If score < threshold (7), Sonnet rewrites once with the critique feedback
 *   4. final_chosen = best (draft_v2 if rewritten else draft_v1)
 *
 * Returns a discriminated union so callers can store ai_failed / retry.
 */
export async function generateOutreachWithCritique(
  claude: Anthropic,
  input: Omit<OutreachGenerationInput, "critiqueFeedback" | "previousDraft">
): Promise<OutreachOutcome> {
  // 1. Sonnet draft_v1
  let v1;
  try {
    v1 = await claude.messages.create({
      model: SONNET_MODEL,
      max_tokens: SONNET_MAX_TOKENS,
      ...buildOutreachGenerationMessage(input),
    });
  } catch (err) {
    return {
      ok: false,
      reason: "ai_call_failed",
      detail: `gen-v1: ${err instanceof Error ? err.message : String(err)}`,
      generate_version: OUTREACH_GENERATE_VERSION,
    };
  }

  const text_v1 = extractText(v1);
  const parsed_v1 = parseOutreachGenerationOutput(text_v1);
  if (!parsed_v1) {
    return {
      ok: false,
      reason: "ai_unparseable_output",
      detail: `gen-v1: ${text_v1.slice(0, 200)}`,
      generate_version: OUTREACH_GENERATE_VERSION,
    };
  }

  let sonnetIn = v1.usage.input_tokens;
  let sonnetOut = v1.usage.output_tokens;

  // 2. Haiku critique
  let critiqueReply;
  try {
    critiqueReply = await claude.messages.create({
      model: HAIKU_MODEL,
      max_tokens: HAIKU_MAX_TOKENS,
      ...buildOutreachCritiqueMessage({ draft: parsed_v1.draft }),
    });
  } catch (err) {
    return {
      ok: false,
      reason: "ai_call_failed",
      detail: `critique: ${err instanceof Error ? err.message : String(err)}`,
      generate_version: OUTREACH_GENERATE_VERSION,
    };
  }

  const critiqueText = extractText(critiqueReply);
  const parsed_critique = parseOutreachCritiqueOutput(critiqueText);
  // If critique parse fails, treat as score=10 (no rewrite). Don't fail the whole outreach over a malformed critic.
  const critiqueScore = parsed_critique?.score ?? 10;
  const critiqueFeedback = parsed_critique?.feedback ?? "";
  const haikuIn = critiqueReply.usage.input_tokens;
  const haikuOut = critiqueReply.usage.output_tokens;

  // 3. Rewrite if below threshold
  let draft_v2: string | null = null;
  let rationale_v2: string | null = null;
  let rewritten = false;

  if (critiqueScore < OUTREACH_CRITIQUE_THRESHOLD && critiqueFeedback) {
    rewritten = true;
    let v2;
    try {
      v2 = await claude.messages.create({
        model: SONNET_MODEL,
        max_tokens: SONNET_MAX_TOKENS,
        ...buildOutreachGenerationMessage({
          ...input,
          critiqueFeedback,
          previousDraft: parsed_v1.draft,
        }),
      });
    } catch {
      // If rewrite fails, keep v1 — better than nothing.
      rewritten = false;
    }

    if (v2) {
      const text_v2 = extractText(v2);
      const parsed_v2 = parseOutreachGenerationOutput(text_v2);
      if (parsed_v2) {
        draft_v2 = parsed_v2.draft;
        rationale_v2 = parsed_v2.rationale;
        sonnetIn += v2.usage.input_tokens;
        sonnetOut += v2.usage.output_tokens;
      } else {
        rewritten = false;
      }
    }
  }

  return {
    ok: true,
    draft_v1: parsed_v1.draft,
    rationale_v1: parsed_v1.rationale,
    critique_score: critiqueScore,
    critique_feedback: critiqueFeedback,
    draft_v2,
    rationale_v2,
    final_chosen: draft_v2 ?? parsed_v1.draft,
    generate_version: OUTREACH_GENERATE_VERSION,
    critique_version: OUTREACH_CRITIQUE_VERSION,
    sonnet_input_tokens: sonnetIn,
    sonnet_output_tokens: sonnetOut,
    haiku_input_tokens: haikuIn,
    haiku_output_tokens: haikuOut,
    rewritten,
  };
}

function extractText(reply: Anthropic.Message): string {
  return reply.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}
