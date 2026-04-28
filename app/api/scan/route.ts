import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClaude } from "@/lib/claude";
import { scoreRelevance } from "@/lib/claude/filter";
import { ageDays, fetchNodeTopics, V2EXError } from "@/lib/v2ex";

/**
 * POST /api/scan
 *
 * Body: { product_id: uuid, node: string, min_score?: 0-10 }
 *
 * v0 founder-testing era: no daily limit, no idempotency window. Reintroduce
 * those when the first non-founder user signs up.
 *
 * RLS sidestep: writes go through the admin client (see lib/supabase/admin.ts).
 * user_id is derived from the user-cookie client and trusted because it came
 * from `getUser()` server-side.
 *
 * NOTE: when deploying to Vercel, re-add `export const runtime = "edge"` and
 * `export const preferredRegion = ["hkg1"]` so Anthropic is reachable from
 * China-mainland users without VPN. Edge is OFF in dev because Next.js dev
 * doesn't reliably surface non-NEXT_PUBLIC_ env vars to the Edge runtime.
 */

const scanRequestSchema = z.object({
  product_id: z.string().uuid(),
  node: z
    .string()
    .min(1, "节点名不能空")
    .max(32, "节点名太长")
    .regex(/^[a-z0-9][a-z0-9-]{0,32}$/, "节点名只允许小写字母 / 数字 / 短横线"),
  min_score: z.number().min(0).max(10).default(6),
});

// Haiku 4.5 pricing (USD per million tokens). Approximate; refine with real bills.
const HAIKU_INPUT_USD_PER_MTOK = 1.0;
const HAIKU_OUTPUT_USD_PER_MTOK = 5.0;

export async function POST(request: NextRequest) {
  // 1. Auth via user cookie client.
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  // 2. Parse + validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_json", message: "请求体不是 JSON" } },
      { status: 400 }
    );
  }
  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "bad_input",
          message: parsed.error.issues[0]?.message ?? "参数不对",
          field: parsed.error.issues[0]?.path[0],
        },
      },
      { status: 400 }
    );
  }
  const { product_id, node, min_score } = parsed.data;

  // 3. Verify product belongs to this user (admin client + manual check).
  const admin = createAdminClient();
  const { data: product, error: productErr } = await admin
    .from("products")
    .select("id, user_id, description, target_persona")
    .eq("id", product_id)
    .single();
  if (productErr || !product || product.user_id !== user.id) {
    return NextResponse.json(
      { error: { code: "product_not_found", message: "找不到这个产品（或不归你）" } },
      { status: 404 }
    );
  }

  // 4. Insert pending scan row.
  const { data: scan, error: scanErr } = await admin
    .from("scans")
    .insert({
      user_id: user.id,
      product_id,
      platform: "v2ex",
      trigger: "user",
    })
    .select("id")
    .single();
  if (scanErr || !scan) {
    return NextResponse.json(
      { error: { code: "db_error", message: scanErr?.message ?? "scan insert failed" } },
      { status: 500 }
    );
  }
  const scanId = scan.id;

  // 5. Fetch V2EX topics. On failure, mark scan finished with error_message.
  let topics;
  try {
    topics = (await fetchNodeTopics(node)).topics;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("scans")
      .update({ finished_at: new Date().toISOString(), error_message: msg })
      .eq("id", scanId);
    const status = err instanceof V2EXError && err.cause_kind === "invalid_node" ? 400 : 502;
    return NextResponse.json(
      { error: { code: "v2ex_error", message: msg }, scan_id: scanId },
      { status }
    );
  }

  if (topics.length === 0) {
    await admin
      .from("scans")
      .update({ finished_at: new Date().toISOString(), prospect_count: 0 })
      .eq("id", scanId);
    return NextResponse.json({
      scan_id: scanId,
      scanned: 0,
      kept: 0,
      ai_failed: 0,
      cost_cents: 0,
    });
  }

  // 6. Score each topic via Haiku (parallel, system prompt cached).
  const claude = getClaude();
  const filterResults = await Promise.all(
    topics.map((topic) =>
      scoreRelevance(claude, {
        productDescription: product.description,
        targetPersona: product.target_persona,
        postTitle: topic.title,
        postBody: topic.content,
      }).then((outcome) => ({ topic, outcome }))
    )
  );

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let aiFailed = 0;

  type ProspectInsert = {
    scan_id: string;
    user_id: string;
    source_platform: "v2ex";
    source_url: string;
    author_handle: string;
    post_title: string;
    post_body: string;
    post_age_days: number;
    post_score: number | null;
    post_reply_count: number;
    ai_relevance_score: number;
    ai_filter_reason: string;
  };
  const prospectRows: ProspectInsert[] = [];

  for (const { topic, outcome } of filterResults) {
    if (!outcome.ok) {
      aiFailed += 1;
      continue;
    }
    totalInputTokens += outcome.input_tokens;
    totalOutputTokens += outcome.output_tokens;
    if (outcome.score < min_score) continue;
    prospectRows.push({
      scan_id: scanId,
      user_id: user.id,
      source_platform: "v2ex",
      source_url: topic.url,
      author_handle: topic.member.username,
      post_title: topic.title,
      post_body: topic.content,
      post_age_days: ageDays(topic.created),
      post_score: null, // V2EX doesn't expose upvotes
      post_reply_count: topic.replies,
      ai_relevance_score: outcome.score,
      ai_filter_reason: `[${outcome.prompt_version}] ${outcome.reason}`,
    });
  }

  // 7. Insert prospects (one batch).
  let inserted = 0;
  if (prospectRows.length > 0) {
    const { error: insertErr } = await admin.from("prospects").insert(prospectRows);
    if (insertErr) {
      await admin
        .from("scans")
        .update({
          finished_at: new Date().toISOString(),
          error_message: `prospect insert: ${insertErr.message}`,
        })
        .eq("id", scanId);
      return NextResponse.json(
        { error: { code: "db_error", message: insertErr.message }, scan_id: scanId },
        { status: 500 }
      );
    }
    inserted = prospectRows.length;
  }

  const costUSD =
    (totalInputTokens * HAIKU_INPUT_USD_PER_MTOK +
      totalOutputTokens * HAIKU_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const costCents = Math.ceil(costUSD * 100);

  await admin
    .from("scans")
    .update({
      finished_at: new Date().toISOString(),
      prospect_count: inserted,
      cost_cents: costCents,
    })
    .eq("id", scanId);

  return NextResponse.json({
    scan_id: scanId,
    scanned: topics.length,
    kept: inserted,
    ai_failed: aiFailed,
    cost_cents: costCents,
    haiku_tokens: { input: totalInputTokens, output: totalOutputTokens },
  });
}
