import { test, expect, describe } from "bun:test";
import { stripTags, parseLeadingInt, parseCountFromAnchor } from "./github-trending";

/**
 * Regression guard for the GitHub trending parser. This code had a real bug:
 * the old `.replace(/[^\d]/g, "")` approach concatenated the star count and the
 * fork count into one giant number (e.g. "1,234" + "5,678" → 12345678, and in
 * the worst case 1.6e+296). The fix scopes each count to its own anchor and
 * takes only the leading integer token. These tests lock that in — GitHub's
 * markup drifts, so a parser regression here means garbage star counts in scan
 * results.
 */

describe("parseLeadingInt", () => {
  test("parses comma-grouped integers", () => {
    expect(parseLeadingInt("1,234")).toBe(1234);
    expect(parseLeadingInt("156,274")).toBe(156274);
  });

  test("takes ONLY the first token — never concatenates a second number", () => {
    // The exact shape of the old bug: two counts in one string.
    expect(parseLeadingInt("1,234 5,678")).toBe(1234);
    expect(parseLeadingInt("42 stars 7 forks")).toBe(42);
  });

  test("returns 0 on no digits / empty", () => {
    expect(parseLeadingInt("")).toBe(0);
    expect(parseLeadingInt("no digits here")).toBe(0);
  });

  test("plain integer", () => {
    expect(parseLeadingInt("99")).toBe(99);
  });
});

describe("stripTags", () => {
  test("removes svg blocks, tags, decodes entities, collapses whitespace", () => {
    const html = `<svg aria-hidden="true"><path d="M8 .25"/></svg>\n   1,234\n  `;
    expect(stripTags(html)).toBe("1,234");
  });

  test("decodes HTML entities", () => {
    expect(stripTags("Tools &amp; Toys &lt;3")).toBe("Tools & Toys <3");
  });
});

describe("parseCountFromAnchor — the 1.6e+296 regression", () => {
  // A realistic Box-row fragment with BOTH the stargazers and forks anchors
  // adjacent, each wrapping an SVG + a comma-grouped number, exactly the layout
  // that broke the old concatenating parser.
  const block = `
    <a href="/HelloGitHub/HelloGitHub/stargazers" class="Link--muted d-inline-block mr-3">
      <svg aria-hidden="true" class="octicon octicon-star"><path d="M8 .25"/></svg>
      156,274
    </a>
    <a href="/HelloGitHub/HelloGitHub/forks" class="Link--muted d-inline-block mr-3">
      <svg aria-hidden="true" class="octicon octicon-repo-forked"><path d="M5 5.372"/></svg>
      19,876
    </a>
  `;

  test("stargazers anchor yields ONLY the star count", () => {
    expect(parseCountFromAnchor(block, "stargazers")).toBe(156274);
  });

  test("forks anchor yields ONLY the fork count", () => {
    expect(parseCountFromAnchor(block, "forks")).toBe(19876);
  });

  test("neither count bleeds into the other (no concatenation)", () => {
    const stars = parseCountFromAnchor(block, "stargazers");
    const forks = parseCountFromAnchor(block, "forks");
    // The old bug produced 15627419876 (or worse). Guard the magnitude.
    expect(stars).toBeLessThan(10_000_000);
    expect(forks).toBeLessThan(10_000_000);
    expect(stars).not.toBe(forks);
  });

  test("missing anchor returns 0, not NaN", () => {
    expect(parseCountFromAnchor("<div>no anchors</div>", "stargazers")).toBe(0);
  });
});
