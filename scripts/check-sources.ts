/**
 * Live data-source health check. Run with `bun run check-sources`.
 *
 * Why this exists: the per-source unit tests use static fixtures, so they
 * CANNOT catch the class of bug that bit us repeatedly in May 2026 — a source's
 * live contract drifting out from under us:
 *   - juejin category ids went stale (frontend returned data:null; "ai" was
 *     silently the 代码人生 category)
 *   - sspai's tag filter was hitting the index endpoint (ignored ?tag=, every
 *     tag returned the same global feed)
 * Those are invisible to fixtures and to `bun run smoke` (which only touches
 * V2EX). This hits each source's REAL API and asserts it returns sane,
 * actually-filtered data. Run it after any source change, or periodically.
 *
 * No AI calls — all four sources are free public APIs, so this is cheap + fast.
 * Exits non-zero if any check fails (CI-gate friendly).
 */
import { fetchNodeTopics } from "../lib/v2ex";
import { fetchJuejinFeed, JUEJIN_CATEGORIES, type JuejinCategory } from "../lib/juejin";
import { fetchSspaiMatrix, SSPAI_TAGS, type SspaiTag } from "../lib/sspai";
import { fetchGitHubTrendingCN } from "../lib/github-trending";

let failed = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "✓" : "✗ FAIL"}  ${name} — ${detail}`);
  if (!ok) failed++;
}

// ── V2EX ────────────────────────────────────────────────────────────────
try {
  const { topics } = await fetchNodeTopics("create");
  check("v2ex create", topics.length >= 5, `${topics.length} topics`);
} catch (e) {
  check("v2ex create", false, String(e).slice(0, 80));
}

// ── Juejin: every configured category must return articles ──────────────
// (Catches the stale-category-id bug — a wrong id returns data:null → 0.)
for (const cat of Object.keys(JUEJIN_CATEGORIES) as JuejinCategory[]) {
  try {
    const { articles } = await fetchJuejinFeed(cat, 10);
    check(`juejin ${cat}`, articles.length >= 1, `${articles.length} articles`);
  } catch (e) {
    check(`juejin ${cat}`, false, String(e).slice(0, 80));
  }
}

// ── Sspai: tags must return content AND actually differ ─────────────────
// (Catches the endpoint-ignores-tag bug — if two distinct tags return the
//  identical first article, filtering is broken.)
try {
  const tags = Object.keys(SSPAI_TAGS).slice(0, 2) as SspaiTag[];
  const [a, b] = await Promise.all(tags.map((t) => fetchSspaiMatrix(t, 10)));
  const aHas = (a?.articles.length ?? 0) >= 1;
  const bHas = (b?.articles.length ?? 0) >= 1;
  check(`sspai ${tags[0]}`, aHas, `${a?.articles.length ?? 0} articles`);
  check(`sspai ${tags[1]}`, bHas, `${b?.articles.length ?? 0} articles`);
  const differ =
    aHas && bHas && a!.articles[0]!.id !== b!.articles[0]!.id;
  check(
    "sspai tag filtering",
    differ,
    differ ? "two tags return different articles" : "TWO TAGS RETURN SAME ARTICLE — filter broken"
  );
} catch (e) {
  check("sspai", false, String(e).slice(0, 80));
}

// ── GitHub trending CN ──────────────────────────────────────────────────
try {
  const { repos } = await fetchGitHubTrendingCN("daily");
  const sane = repos.every((r) => r.stars >= 0 && r.stars < 100_000_000);
  check(
    "github-cn daily",
    repos.length >= 5 && sane,
    `${repos.length} repos, stars sane=${sane}`
  );
} catch (e) {
  check("github-cn daily", false, String(e).slice(0, 80));
}

console.log(failed === 0 ? "\nAll sources healthy." : `\n${failed} source check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
