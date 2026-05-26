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

// ── Sspai: EVERY configured tag must return content, AND filtering must
//    actually differ. sspai tag strings are exactly what drifted (3 of the old
//    set silently went dead), so check the whole configured set, not a sample.
try {
  const tags = Object.keys(SSPAI_TAGS) as SspaiTag[];
  const results = await Promise.all(
    tags.map((t) =>
      fetchSspaiMatrix(t, 10).then(
        (r) => ({ t, n: r.articles.length, firstId: r.articles[0]?.id ?? null }),
        (e) => ({ t, n: -1, firstId: null, err: String(e).slice(0, 60) })
      )
    )
  );
  for (const r of results) {
    check(`sspai ${r.t}`, r.n >= 1, r.n < 0 ? `error: ${(r as { err?: string }).err}` : `${r.n} articles`);
  }
  // Filtering sanity: the configured tags must not all collapse to one feed.
  // If every tag returns the same first article, the ?tag= filter is broken
  // (the index-endpoint regression). Distinct ids across tags = filtering works.
  const ids = results.filter((r) => r.firstId != null).map((r) => r.firstId);
  const distinct = new Set(ids).size;
  check(
    "sspai tag filtering",
    ids.length >= 2 && distinct >= 2,
    distinct >= 2
      ? `${distinct} distinct first-articles across ${ids.length} tags`
      : "ALL TAGS RETURN SAME ARTICLE — filter broken"
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
