/**
 * End-to-end smoke test for the AI pipeline, run outside Next.js so no
 * server / auth / browser is needed.  Catches integration regressions in:
 *   1. V2EX API client
 *   2. Haiku relevance filter (prompt + parsing)
 *   3. Sonnet outreach generation + Haiku critique + rewrite
 *   4. @vercel/og poster rendering
 *
 * Run: bun run smoke
 * Cost per run: ~$0.02 (1 Haiku call + 1 Sonnet+critique pass + 2 poster renders)
 */

import { fetchNodeTopics, ageDays } from "../lib/v2ex";
import { getClaude } from "../lib/claude";
import { scoreRelevance } from "../lib/claude/filter";
import { generateOutreachWithCritique } from "../lib/claude/generate";
import { renderWeeklyPoster } from "../lib/poster";
import { shanghaiWeekBounds } from "../lib/weekly-stats";

const PRODUCT = {
  productDisplayName: "First 100",
  productDescription:
    "AI 帮中文 indie hacker 找前 100 个用户。输入产品描述，扫 V2EX + 即刻最近 30 天的帖子，AI 过滤 + 写个性化中文破冰，你复制粘贴去发，回来标 sent/replied/converted。",
  targetPersona:
    "中文 indie hacker，月收入 ¥30-100k 副业，已经在 V2EX / 即刻漂着但不擅长主动接触陌生人，对 spam 反感，预算 < $50/月。",
};

let pass = 0;
let fail = 0;

async function check(name: string, fn: () => Promise<void>) {
  process.stdout.write(`▸ ${name} ... `);
  try {
    await fn();
    console.log("✓");
    pass += 1;
  } catch (err) {
    console.log("✗");
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.error(`   ${err.stack.split("\n").slice(1, 3).join("\n   ")}`);
    }
    fail += 1;
  }
}

// 1. V2EX
await check("V2EX fetchNodeTopics(create) returns >= 5 topics", async () => {
  const result = await fetchNodeTopics("create");
  if (result.topics.length < 5) {
    throw new Error(`only ${result.topics.length} topics`);
  }
  const t = result.topics[0]!;
  if (typeof t.title !== "string" || typeof t.content !== "string") {
    throw new Error("topic shape wrong");
  }
  if (typeof ageDays(t.created) !== "number") {
    throw new Error("ageDays returned non-number");
  }
});

// 2. Haiku filter
await check("Haiku scoreRelevance returns 0-10 + reason", async () => {
  const claude = getClaude();
  const outcome = await scoreRelevance(claude, {
    productDescription: PRODUCT.productDescription,
    targetPersona: PRODUCT.targetPersona,
    postTitle: "求推荐：怎么给 indie 项目找前 100 个用户？",
    postBody:
      "我做了一个小工具，技术上自己挺满意，但发到 PH 之后没人理。完全不知道下一步该去哪找用户。求各位 indie 老哥分享下你们当年怎么搞起来的？",
  });
  if (!outcome.ok) throw new Error(`filter failed: ${outcome.reason} ${outcome.detail}`);
  if (outcome.score < 6) throw new Error(`score=${outcome.score} (expected ≥6 for clearly relevant post)`);
  if (typeof outcome.reason !== "string" || outcome.reason.length < 5) {
    throw new Error(`reason missing or too short: ${outcome.reason}`);
  }
  console.log(`     score=${outcome.score} reason="${outcome.reason}"`);
});

// 3. Sonnet generate + critique
await check("Sonnet generateOutreachWithCritique returns valid draft", async () => {
  const claude = getClaude();
  const outcome = await generateOutreachWithCritique(claude, {
    ...PRODUCT,
    postTitle: "怎么给 indie 项目找前 100 个用户？",
    postBody:
      "做了个小工具，技术上挺满意，但发完 PH 之后 24 小时 0 用户。下一步该去哪？",
    authorHandle: "test_user",
  });
  if (!outcome.ok) throw new Error(`gen failed: ${outcome.reason} ${outcome.detail}`);
  if (typeof outcome.draft_v1 !== "string" || outcome.draft_v1.length < 20) {
    throw new Error(`draft_v1 too short: "${outcome.draft_v1}"`);
  }
  if (outcome.final_chosen.length > 280) {
    throw new Error(`final_chosen exceeds 280 chars: ${outcome.final_chosen.length}`);
  }
  if (typeof outcome.critique_score !== "number") {
    throw new Error("critique_score missing");
  }
  console.log(`     critique_score=${outcome.critique_score} rewritten=${outcome.rewritten}`);
  console.log(`     final_chosen[0..80]="${outcome.final_chosen.slice(0, 80)}..."`);
});

// 4. Poster
await check("@vercel/og renderWeeklyPoster returns PNG buffer", async () => {
  const { iso_week, week_start_utc, week_end_utc } = shanghaiWeekBounds();
  const response = await renderWeeklyPoster({
    productDisplayName: PRODUCT.productDisplayName,
    stats: {
      iso_week,
      week_start_iso: week_start_utc.toISOString(),
      week_end_iso: week_end_utc.toISOString(),
      sent: 12,
      replied: 4,
      converted: 1,
      skipped: 2,
      prospects_added: 25,
    },
    weekIndex: 3,
  });
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 5000) {
    throw new Error(`PNG too small: ${buffer.byteLength} bytes`);
  }
  // PNG starts with bytes 89 50 4E 47 0D 0A 1A 0A
  const header = new Uint8Array(buffer.slice(0, 8));
  const expected = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i += 1) {
    if (header[i] !== expected[i]) {
      throw new Error(`PNG header byte ${i} wrong: ${header[i]} vs ${expected[i]}`);
    }
  }
  console.log(`     ${(buffer.byteLength / 1024).toFixed(1)}KB PNG, valid header`);
});

// 5. Empty-state poster (different code path)
await check("renderWeeklyPoster empty-state branch", async () => {
  const { iso_week, week_start_utc, week_end_utc } = shanghaiWeekBounds();
  const response = await renderWeeklyPoster({
    productDisplayName: "First 100",
    stats: {
      iso_week,
      week_start_iso: week_start_utc.toISOString(),
      week_end_iso: week_end_utc.toISOString(),
      sent: 0,
      replied: 0,
      converted: 0,
      skipped: 0,
      prospects_added: 5,
    },
    weekIndex: 1,
  });
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 5000) throw new Error(`PNG too small: ${buffer.byteLength}`);
});

console.log("");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
