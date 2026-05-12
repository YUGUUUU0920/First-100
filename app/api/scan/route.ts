import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClaude } from "@/lib/claude";
import { scoreRelevance } from "@/lib/claude/filter";
import { generateOutreachWithCritique } from "@/lib/claude/generate";
import { ageDays, fetchNodeTopics, V2EXError } from "@/lib/v2ex";
import {
  JUEJIN_CATEGORIES,
  fetchJuejinFeed,
  JuejinError,
  type JuejinCategory,
} from "@/lib/juejin";
import { SSPAI_TAGS, fetchSspaiMatrix, SspaiError, type SspaiTag } from "@/lib/sspai";
import {
  fetchGitHubTrendingCN,
  GitHubTrendingError,
  type GitHubSince,
} from "@/lib/github-trending";

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
 * Runtime = Node (default); HKG region pinned globally via vercel.json so
 * the function runs close to Anthropic API edges for China-mainland users.
 * Node runtime over Edge because /api/scan does up to 60s of Promise.all
 * Claude calls; Edge tops out at 30s on Hobby plan.
 */
export const preferredRegion = ["hkg1"];

const scanRequestSchema = z.object({
  product_id: z.string().uuid(),
  source: z.enum(["v2ex", "juejin", "sspai", "github-cn"]).default("v2ex"),
  // For v2ex: node slug (lowercase letters/digits/hyphens).
  // For juejin / sspai: category key (latin or Chinese, validated downstream).
  // For github-cn: 'daily' / 'weekly' / 'monthly' (mapped to GitHubSince).
  node: z.string().min(1, "node 不能空").max(32, "node 太长"),
  min_score: z.number().min(0).max(10).default(6),
});

// Pricing (USD per million tokens). Approximate; refine with real bills.
const HAIKU_INPUT_USD_PER_MTOK = 1.0;
const HAIKU_OUTPUT_USD_PER_MTOK = 5.0;
const SONNET_INPUT_USD_PER_MTOK = 3.0;
const SONNET_OUTPUT_USD_PER_MTOK = 15.0;

/**
 * CSRF defense-in-depth: reject requests whose Origin / Referer header is not
 * our own site. Server Actions get this for free via Next.js; route handlers
 * don't. Same-Site=Lax cookies block most cross-site POSTs, but explicit
 * origin check closes subdomain / cookie-confusion edge cases.
 *
 * Returns null if origin is OK, else a 403 response.
 */
function originGuard(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) {
    // No origin header at all — server-to-server call, allow (cron etc.).
    // Route is auth-gated so this isn't bypass-able by unauthenticated users.
    return null;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: { code: "bad_origin" } }, { status: 403 });
  }
  const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost").host;
  if (originHost !== siteHost) {
    return NextResponse.json(
      { error: { code: "bad_origin", message: `origin ${originHost} not allowed` } },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  // 0. CSRF defense — reject cross-origin POSTs.
  const csrfBlock = originGuard(request);
  if (csrfBlock) return csrfBlock;

  // 1. Auth via user cookie client.
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  // 1.5. Rate limit — count this user's `scans` rows in the last hour.
  // DB-based instead of Upstash to avoid an external dep on day 1. Each scan
  // costs ~$0.02 in Claude tokens; cap at SCAN_LIMIT_PER_HOUR per user blocks
  // the runaway-bot scenario. Founder can scan ~5 nodes per session manually
  // and stay well under 10/hour.
  const SCAN_LIMIT_PER_HOUR = 10;
  const _admin_rl = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentScanCount } = await _admin_rl
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", oneHourAgo);
  if ((recentScanCount ?? 0) >= SCAN_LIMIT_PER_HOUR) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limit",
          message: `每小时最多 ${SCAN_LIMIT_PER_HOUR} 次扫描。等一会再来，或者用粘贴源继续。`,
        },
      },
      { status: 429, headers: { "retry-after": "3600" } }
    );
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
  const { product_id, source, node, min_score } = parsed.data;

  // 3. Verify product belongs to this user (admin client + manual check).
  const admin = createAdminClient();
  const { data: product, error: productErr } = await admin
    .from("products")
    .select("id, user_id, display_name, description, target_persona")
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
      platform: source,
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

  // 5. Fetch posts from the chosen source. Normalize into a common shape so
  //    the AI filter + insert pipeline below doesn't care where they came from.
  type NormalizedPost = {
    title: string;
    body: string;
    url: string;
    author_handle: string;
    age_days: number;
    score: number | null;       // post_score column (likes / 点赞)
    reply_count: number | null;
  };

  let posts: NormalizedPost[];
  try {
    switch (source) {
      case "juejin": {
        const cat = node as JuejinCategory;
        if (!(cat in JUEJIN_CATEGORIES)) {
          throw new JuejinError(
            `juejin 不支持 category：${node}（用 ${Object.keys(JUEJIN_CATEGORIES).join(" / ")}）`,
            "invalid_category"
          );
        }
        const result = await fetchJuejinFeed(cat);
        posts = result.articles.map((a) => ({
          title: a.title,
          body: a.brief,
          url: a.url,
          author_handle: a.author_handle,
          age_days: ageDays(a.ctime),
          score: a.digg_count,
          reply_count: a.comment_count,
        }));
        break;
      }
      case "sspai": {
        const tag = node as SspaiTag;
        if (!(tag in SSPAI_TAGS)) {
          throw new SspaiError(
            `sspai 不支持 tag：${node}（用 ${Object.keys(SSPAI_TAGS).join(" / ")}）`,
            "invalid_tag"
          );
        }
        const result = await fetchSspaiMatrix(tag);
        posts = result.articles.map((a) => ({
          title: a.title,
          body: a.summary,
          url: a.url,
          author_handle: a.author_nickname || a.author_slug,
          age_days: ageDays(a.released_at),
          score: a.like_count,
          reply_count: a.comment_count,
        }));
        break;
      }
      case "github-cn": {
        const since: GitHubSince =
          node === "weekly" ? "weekly" : node === "monthly" ? "monthly" : "daily";
        const result = await fetchGitHubTrendingCN(since);
        posts = result.repos.map((r) => ({
          title: r.title,
          body: r.description || `${r.language} · ${r.stars}★ · ${r.stars_today}★ today`,
          url: r.url,
          author_handle: r.author_handle,
          age_days: 0, // trending = recently active by definition
          score: r.stars,
          reply_count: null,
        }));
        break;
      }
      default: {
        // v2ex
        const topics = (await fetchNodeTopics(node)).topics;
        posts = topics.map((t) => ({
          title: t.title,
          body: t.content,
          url: t.url,
          author_handle: t.member.username,
          age_days: ageDays(t.created),
          score: null,
          reply_count: t.replies,
        }));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("scans")
      .update({ finished_at: new Date().toISOString(), error_message: msg })
      .eq("id", scanId);
    const isInvalid =
      (err instanceof V2EXError && err.cause_kind === "invalid_node") ||
      (err instanceof JuejinError && err.cause_kind === "invalid_category") ||
      (err instanceof SspaiError && err.cause_kind === "invalid_tag") ||
      err instanceof GitHubTrendingError;
    const status = isInvalid ? 400 : 502;
    return NextResponse.json(
      { error: { code: "fetch_error", message: msg }, scan_id: scanId },
      { status }
    );
  }
  const topics = posts; // reuse variable name below — same NormalizedPost shape

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

  // 6. Score each post via Haiku (parallel, system prompt cached).
  const claude = getClaude();
  const filterResults = await Promise.all(
    topics.map((post) =>
      scoreRelevance(claude, {
        productDescription: product.description,
        targetPersona: product.target_persona,
        postTitle: post.title,
        postBody: post.body,
      }).then((outcome) => ({ post, outcome }))
    )
  );

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let aiFailed = 0;

  type ProspectInsert = {
    scan_id: string;
    user_id: string;
    source_platform: typeof source;
    source_url: string;
    author_handle: string;
    post_title: string;
    post_body: string;
    post_age_days: number;
    post_score: number | null;
    post_reply_count: number | null;
    ai_relevance_score: number;
    ai_filter_reason: string;
  };
  const prospectRows: ProspectInsert[] = [];

  for (const { post, outcome } of filterResults) {
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
      source_platform: source,
      source_url: post.url,
      author_handle: post.author_handle,
      post_title: post.title,
      post_body: post.body,
      post_age_days: post.age_days,
      post_score: post.score,
      post_reply_count: post.reply_count,
      ai_relevance_score: outcome.score,
      ai_filter_reason: `[${outcome.prompt_version}] ${outcome.reason}`,
    });
  }

  // 7. Insert prospects (one batch). Need IDs back for outreach generation.
  let inserted = 0;
  let insertedProspects: Array<{
    id: string;
    post_title: string | null;
    post_body: string;
    author_handle: string;
  }> = [];
  if (prospectRows.length > 0) {
    const { data: insertedRows, error: insertErr } = await admin
      .from("prospects")
      .insert(prospectRows)
      .select("id, post_title, post_body, author_handle");
    if (insertErr || !insertedRows) {
      await admin
        .from("scans")
        .update({
          finished_at: new Date().toISOString(),
          error_message: `prospect insert: ${insertErr?.message ?? "no data"}`,
        })
        .eq("id", scanId);
      return NextResponse.json(
        { error: { code: "db_error", message: insertErr?.message ?? "insert failed" }, scan_id: scanId },
        { status: 500 }
      );
    }
    inserted = insertedRows.length;
    insertedProspects = insertedRows;
  }

  // 8. For each kept prospect, generate Sonnet outreach + Haiku critique
  //    (parallel). One Haiku failure or unparseable output marks just that
  //    outreach as ai_failed; the rest still land.
  let sonnetIn = 0;
  let sonnetOut = 0;
  let haikuCritIn = 0;
  let haikuCritOut = 0;
  let outreachFailed = 0;

  if (insertedProspects.length > 0) {
    const outreachResults = await Promise.all(
      insertedProspects.map((p) =>
        generateOutreachWithCritique(claude, {
          productDisplayName: product.display_name,
          productDescription: product.description,
          targetPersona: product.target_persona,
          postTitle: p.post_title,
          postBody: p.post_body,
          authorHandle: p.author_handle,
        }).then((outcome) => ({ prospect: p, outcome }))
      )
    );

    type OutreachInsert = {
      prospect_id: string;
      user_id: string;
      draft_v1: string;
      critique_score: number | null;
      critique_feedback: string | null;
      draft_v2: string | null;
      final_chosen: string | null;
      char_count: number;
      sonnet_tokens: number;
      haiku_tokens: number;
      status: "ok" | "ai_failed" | "pending";
    };
    const outreachRows: OutreachInsert[] = [];

    for (const { prospect, outcome } of outreachResults) {
      if (!outcome.ok) {
        outreachFailed += 1;
        outreachRows.push({
          prospect_id: prospect.id,
          user_id: user.id,
          draft_v1: "",
          critique_score: null,
          critique_feedback: `[${outcome.generate_version}] ${outcome.reason}: ${outcome.detail}`,
          draft_v2: null,
          final_chosen: null,
          char_count: 0,
          sonnet_tokens: 0,
          haiku_tokens: 0,
          status: "ai_failed",
        });
        continue;
      }
      sonnetIn += outcome.sonnet_input_tokens;
      sonnetOut += outcome.sonnet_output_tokens;
      haikuCritIn += outcome.haiku_input_tokens;
      haikuCritOut += outcome.haiku_output_tokens;

      outreachRows.push({
        prospect_id: prospect.id,
        user_id: user.id,
        draft_v1: outcome.draft_v1,
        critique_score: outcome.critique_score,
        critique_feedback: `[${outcome.generate_version}|${outcome.critique_version}] ${outcome.critique_feedback}`,
        draft_v2: outcome.draft_v2,
        final_chosen: outcome.final_chosen,
        char_count: outcome.final_chosen.length,
        sonnet_tokens: outcome.sonnet_input_tokens + outcome.sonnet_output_tokens,
        haiku_tokens: outcome.haiku_input_tokens + outcome.haiku_output_tokens,
        status: "ok",
      });
    }

    if (outreachRows.length > 0) {
      const { error: outreachInsertErr } = await admin.from("outreaches").insert(outreachRows);
      if (outreachInsertErr) {
        // Don't fail the whole scan — prospects are saved. Log via scan.error_message.
        await admin
          .from("scans")
          .update({ error_message: `outreach insert: ${outreachInsertErr.message}` })
          .eq("id", scanId);
      }
    }
  }

  // 9. Cost rollup + scan completion.
  const filterCostUSD =
    (totalInputTokens * HAIKU_INPUT_USD_PER_MTOK +
      totalOutputTokens * HAIKU_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const sonnetCostUSD =
    (sonnetIn * SONNET_INPUT_USD_PER_MTOK + sonnetOut * SONNET_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const critiqueCostUSD =
    (haikuCritIn * HAIKU_INPUT_USD_PER_MTOK + haikuCritOut * HAIKU_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const costCents = Math.ceil((filterCostUSD + sonnetCostUSD + critiqueCostUSD) * 100);

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
    ai_failed_filter: aiFailed,
    ai_failed_outreach: outreachFailed,
    cost_cents: costCents,
    tokens: {
      filter: { input: totalInputTokens, output: totalOutputTokens },
      sonnet: { input: sonnetIn, output: sonnetOut },
      critique: { input: haikuCritIn, output: haikuCritOut },
    },
  });
}
