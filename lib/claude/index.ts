import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude model IDs. Pinned to specific versions so prompt-tuning regressions
 * are detectable. Bump deliberately.
 *
 * Haiku 4.5 — fast + cheap, used for relevance filter (per-prospect) and
 * outreach AI-flavor critique. ~$0.001/call at our prompt size.
 *
 * Sonnet 4.6 — used for personalized outreach generation. ~$0.005/call.
 */
export const HAIKU_MODEL = "claude-haiku-4-5-20251001" as const;
export const SONNET_MODEL = "claude-sonnet-4-6" as const;

/**
 * Per-call token caps from CEO plan §cost & abuse bounds.
 * Sonnet outreach: ≤ 280 字符 → ~400 tokens with overhead.
 * Haiku filter/critique: short JSON response → 200 tokens is plenty.
 */
export const HAIKU_MAX_TOKENS = 200;
export const SONNET_MAX_TOKENS = 400;

let _client: Anthropic | null = null;

/**
 * Lazy singleton. Throws on first call if ANTHROPIC_API_KEY is missing —
 * fails loud rather than letting the SDK return an opaque 401 later.
 *
 * IMPORTANT: every consumer of this client must run on Vercel Edge runtime
 * pinned to `hkg1` region. Direct calls from China-mainland origins to
 * api.anthropic.com are blocked. Pin in vercel.json (global) AND each route
 * (`export const preferredRegion = ['hkg1']`) so a misconfig is loud.
 */
export function getClaude(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  _client = new Anthropic({ apiKey });
  return _client;
}
