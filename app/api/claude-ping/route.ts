import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClaude, HAIKU_MODEL, HAIKU_MAX_TOKENS } from "@/lib/claude";

/**
 * Smoke test for Claude connectivity. Auth-gated so randoms can't drain budget.
 *
 * Use: GET /api/claude-ping while logged in. Returns latency + token usage.
 *
 * NOTE: re-enable Edge runtime + HKG region when deploying to Vercel
 * (`export const runtime = "edge"; export const preferredRegion = ["hkg1"];`).
 * Off in dev because Next.js dev doesn't pass non-NEXT_PUBLIC_ env to Edge.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const claude = getClaude();
    const start = Date.now();
    const message = await claude.messages.create({
      model: HAIKU_MODEL,
      max_tokens: HAIKU_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: '回 5 个汉字打招呼。只回汉字，不要标点。',
        },
      ],
    });
    const latency_ms = Date.now() - start;

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({
      ok: true,
      latency_ms,
      model: message.model,
      stop_reason: message.stop_reason,
      usage: message.usage,
      text,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// Anthropic types are imported only for the narrowing predicate above.
import type Anthropic from "@anthropic-ai/sdk";
