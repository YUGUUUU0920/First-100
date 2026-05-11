/**
 * Relevance-filter eval runner.
 *
 * Reads `docs/eval/relevance-filter-samples.md`, extracts every sample
 * with a `label: relevant` or `label: not_relevant` line, calls Haiku on
 * each, and reports precision / recall against the labels.
 *
 * Unlabeled samples (`label: ?` or missing) are skipped — the report tells
 * you how many are still pending so you know how far through the 30+30
 * target you are.
 *
 * Pass threshold (CEO plan §eng-review test plan):
 *   - precision ≥ 80%  (of what we said is relevant, ≥ 80% really is)
 *   - recall    ≥ 70%  (of all true relevant, we catch ≥ 70%)
 *
 * Usage:
 *   bun run eval
 *   bun run eval --min-score 5     # try a different threshold
 *   bun run eval --file <path>     # eval against a snapshot copy
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getClaude } from "../lib/claude";
import { scoreRelevance } from "../lib/claude/filter";

// Defaults — change with flags or env if needed.
const DEFAULT_FILE = "docs/eval/relevance-filter-samples.md";
const DEFAULT_MIN_SCORE = 6;

// Product context to score against. Defaults to First 100 itself (the
// founder's product). Override via env to test against a different product.
const PRODUCT_DESCRIPTION =
  process.env.EVAL_PRODUCT_DESCRIPTION ??
  "First 100 是面向中文 indie hacker 的用户获取助手。输入产品描述后，5 分钟从 V2EX 节点 + 即刻粘贴的帖子里挑出潜在用户，AI 写中文个性化破冰回复，founder 自己复制粘贴去发。免费 beta。卖给的是「做完产品没人用」的独立开发者。";
const TARGET_PERSONA =
  process.env.EVAL_TARGET_PERSONA ??
  "中文 indie hacker，月收入 ¥30-100k 主业 + 副业写产品，已经在 V2EX / 即刻漂，但不擅长主动接触陌生人。已经发布了产品但用户数 < 100。";

interface Sample {
  index: number;
  title: string;
  url: string;
  author: string;
  body: string;
  label: "relevant" | "not_relevant" | "unlabeled";
}

function parseSamples(text: string, platformHeading: string): Sample[] {
  // Find the platform section: `## V2EX samples` or `## 即刻 samples`.
  const platformIdx = text.indexOf(`## ${platformHeading}`);
  if (platformIdx < 0) return [];
  const platformEndIdx = text.indexOf("\n## ", platformIdx + 1);
  const section = text.slice(
    platformIdx,
    platformEndIdx < 0 ? text.length : platformEndIdx
  );

  // Split into per-sample blocks by `### <number>.` heading.
  const blocks = section.split(/\n### \d+\./).slice(1);
  const samples: Sample[] = [];
  blocks.forEach((block, i) => {
    const titleMatch = block.match(/^\s*[⬜✅❌🟢🔴⚠️]\s*(?:unlabeled\s*—\s*)?"?([^"\n]+?)"?\s*\n/);
    const urlMatch = block.match(/- url:\s*([^\n]+)/);
    const authorMatch = block.match(/- author:\s*([^\n]+)/);
    const bodyMatch = block.match(/- body:\s*"((?:[^"\\]|\\.)*)"/s);
    const labelMatch = block.match(/- label:\s*([^\n]+)/);

    const labelRaw =
      labelMatch && labelMatch[1] ? labelMatch[1].trim().toLowerCase() : "?";
    const label: Sample["label"] =
      labelRaw === "relevant"
        ? "relevant"
        : labelRaw === "not_relevant" || labelRaw === "not-relevant"
          ? "not_relevant"
          : "unlabeled";

    samples.push({
      index: i + 1,
      title: titleMatch && titleMatch[1] ? titleMatch[1].trim() : "(no title)",
      url: urlMatch && urlMatch[1] ? urlMatch[1].trim() : "",
      author: authorMatch && authorMatch[1] ? authorMatch[1].trim() : "",
      body:
        bodyMatch && bodyMatch[1]
          ? bodyMatch[1].replace(/\\"/g, '"').trim()
          : "",
      label,
    });
  });
  return samples;
}

interface ScoredSample extends Sample {
  predicted_score: number | null;
  predicted_label: "relevant" | "not_relevant" | "filter_failed";
  reason: string;
}

async function scoreOne(s: Sample, minScore: number): Promise<ScoredSample> {
  if (!s.body) {
    return {
      ...s,
      predicted_score: null,
      predicted_label: "filter_failed",
      reason: "(empty body)",
    };
  }
  const claude = getClaude();
  const outcome = await scoreRelevance(claude, {
    productDescription: PRODUCT_DESCRIPTION,
    targetPersona: TARGET_PERSONA,
    postTitle: s.title,
    postBody: s.body,
  });
  if (!outcome.ok) {
    return {
      ...s,
      predicted_score: null,
      predicted_label: "filter_failed",
      reason: `${outcome.reason}: ${outcome.detail.slice(0, 100)}`,
    };
  }
  return {
    ...s,
    predicted_score: outcome.score,
    predicted_label: outcome.score >= minScore ? "relevant" : "not_relevant",
    reason: outcome.reason,
  };
}

function computeMetrics(
  scored: ScoredSample[]
): { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number; tn: number } {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const s of scored) {
    if (s.label === "unlabeled" || s.predicted_label === "filter_failed") continue;
    const truthRelevant = s.label === "relevant";
    const predRelevant = s.predicted_label === "relevant";
    if (truthRelevant && predRelevant) tp++;
    else if (!truthRelevant && predRelevant) fp++;
    else if (truthRelevant && !predRelevant) fn++;
    else tn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, tp, fp, fn, tn };
}

// ─── main ────────────────────────────────────────────────────────────────
const args: string[] = process.argv.slice(2);
const fileFlag = args.findIndex((a: string) => a === "--file");
const fileArg = fileFlag >= 0 ? args[fileFlag + 1] : undefined;
const filePath = resolve(fileArg ?? DEFAULT_FILE);
const minScoreFlag = args.findIndex((a: string) => a === "--min-score");
const minScoreArg = minScoreFlag >= 0 ? args[minScoreFlag + 1] : undefined;
const minScore = minScoreArg ? Number(minScoreArg) : DEFAULT_MIN_SCORE;

console.log(`eval file: ${filePath}`);
console.log(`min_score threshold: ${minScore}`);
console.log(`product: ${PRODUCT_DESCRIPTION.slice(0, 60)}...`);
console.log("");

const text = readFileSync(filePath, "utf8");
const v2ex = parseSamples(text, "V2EX samples");
const jike = parseSamples(text, "即刻 samples");

for (const [platform, samples] of [
  ["V2EX", v2ex],
  ["即刻", jike],
] as const) {
  const labeled = samples.filter((s) => s.label !== "unlabeled");
  console.log(
    `═══ ${platform}: ${samples.length} samples (${labeled.length} labeled, ${samples.length - labeled.length} unlabeled) ═══`
  );

  if (labeled.length === 0) {
    console.log("  (skipping — no labeled samples yet)\n");
    continue;
  }

  console.log("  scoring via Haiku (parallel, ≤ $0.001/each)...");
  const scored = await Promise.all(labeled.map((s) => scoreOne(s, minScore)));

  // Disagreements first (most useful for prompt tuning)
  const disagreements = scored.filter(
    (s) => s.predicted_label !== "filter_failed" && s.predicted_label !== s.label
  );

  if (disagreements.length > 0) {
    console.log(`\n  Disagreements (${disagreements.length}):`);
    for (const s of disagreements) {
      console.log(
        `    [${s.index}] truth=${s.label} pred=${s.predicted_label} score=${s.predicted_score}`
      );
      console.log(`         "${s.title.slice(0, 60)}"`);
      console.log(`         AI reason: ${s.reason.slice(0, 100)}`);
    }
  }

  const m = computeMetrics(scored);
  const fmt = (n: number) => `${(n * 100).toFixed(1)}%`;

  const precisionPass = m.precision >= 0.8;
  const recallPass = m.recall >= 0.7;
  console.log(
    `\n  ${platform}  precision: ${fmt(m.precision)} ${precisionPass ? "✓" : "✗ (target ≥80%)"}`
  );
  console.log(
    `         recall:    ${fmt(m.recall)} ${recallPass ? "✓" : "✗ (target ≥70%)"}`
  );
  console.log(
    `         f1:        ${fmt(m.f1)}   tp=${m.tp} fp=${m.fp} fn=${m.fn} tn=${m.tn}`
  );

  const filterFailed = scored.filter((s) => s.predicted_label === "filter_failed");
  if (filterFailed.length > 0) {
    console.log(`  (${filterFailed.length} samples filter_failed — not counted)`);
  }

  console.log("");
}

if (v2ex.filter((s) => s.label !== "unlabeled").length === 0 && jike.filter((s) => s.label !== "unlabeled").length === 0) {
  console.log("No labeled samples yet. Edit docs/eval/relevance-filter-samples.md and change");
  console.log("each `label: ?` to either `label: relevant` or `label: not_relevant`, then rerun.");
}
