import type Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MAX_TOKENS, HAIKU_MODEL } from "./index";
import {
  buildRelevanceFilterMessage,
  parseRelevanceFilterOutput,
  RELEVANCE_FILTER_VERSION,
  type RelevanceFilterInput,
} from "./prompts";

export interface FilterResult {
  ok: true;
  score: number;
  reason: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
}

export interface FilterFailure {
  ok: false;
  reason: "ai_call_failed" | "ai_unparseable_output";
  detail: string;
  prompt_version: string;
}

export type FilterOutcome = FilterResult | FilterFailure;

/**
 * Score one post via Haiku. Wraps the SDK call, parses the JSON, returns
 * a discriminated union so callers handle failures explicitly without
 * try/catch noise on every Promise.allSettled branch.
 */
export async function scoreRelevance(
  claude: Anthropic,
  input: RelevanceFilterInput
): Promise<FilterOutcome> {
  const { system, messages } = buildRelevanceFilterMessage(input);

  let reply;
  try {
    reply = await claude.messages.create({
      model: HAIKU_MODEL,
      max_tokens: HAIKU_MAX_TOKENS,
      system,
      messages,
    });
  } catch (err) {
    return {
      ok: false,
      reason: "ai_call_failed",
      detail: err instanceof Error ? err.message : String(err),
      prompt_version: RELEVANCE_FILTER_VERSION,
    };
  }

  const text = reply.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = parseRelevanceFilterOutput(text);
  if (!parsed) {
    return {
      ok: false,
      reason: "ai_unparseable_output",
      detail: text.slice(0, 200),
      prompt_version: RELEVANCE_FILTER_VERSION,
    };
  }

  return {
    ok: true,
    score: parsed.score,
    reason: parsed.reason,
    prompt_version: RELEVANCE_FILTER_VERSION,
    input_tokens: reply.usage.input_tokens,
    output_tokens: reply.usage.output_tokens,
  };
}
