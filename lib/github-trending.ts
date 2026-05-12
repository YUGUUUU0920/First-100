/**
 * GitHub trending CN repos — scrapes github.com/trending HTML.
 *
 * No official API. The community proxies (ghapi.huchen.dev) are unreliable.
 * We parse the page directly using regex against the well-known structure
 * (Box-row blocks per repo). GitHub doesn't rate-limit unauth'd GET on the
 * trending page meaningfully; one request returns ≈25 repos.
 *
 * Filters: spoken_language_code=zh narrows to repos with Chinese READMEs
 * (largely Chinese maintainers and users). since=daily / weekly / monthly.
 */

const TRENDING_URL = "https://github.com/trending";

export interface GitHubRepo {
  id: string;          // "owner/repo"
  title: string;       // "owner / repo"
  url: string;
  description: string;
  stars: number;
  forks: number;
  stars_today: number;
  language: string;
  author_handle: string; // owner
}

export class GitHubTrendingError extends Error {
  constructor(
    message: string,
    public readonly cause_kind: "network" | "http_error" | "parse_error",
    public readonly status?: number
  ) {
    super(message);
    this.name = "GitHubTrendingError";
  }
}

export type GitHubSince = "daily" | "weekly" | "monthly";

export async function fetchGitHubTrendingCN(
  since: GitHubSince = "daily"
): Promise<{ repos: GitHubRepo[]; fetched_at: number }> {
  const url = `${TRENDING_URL}?since=${since}&spoken_language_code=zh`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // GitHub serves a lighter HTML for non-browser UAs; we still need it parseable.
        "User-Agent":
          "Mozilla/5.0 (compatible; First100/0.1; +https://yourfirst100.co)",
        Accept: "text/html",
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new GitHubTrendingError(
      `连不上 github.com：${err instanceof Error ? err.message : String(err)}`,
      "network"
    );
  }

  if (!response.ok) {
    throw new GitHubTrendingError(
      `GitHub trending 返回 ${response.status}`,
      "http_error",
      response.status
    );
  }

  const html = await response.text();

  // Each repo is wrapped in <article class="Box-row">...</article>
  const blocks = html
    .split(/<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>/)
    .slice(1);

  const repos: GitHubRepo[] = [];
  for (const block of blocks) {
    const repoMatch = block.match(
      /<h2[^>]*>\s*<a[^>]*href="\/([^/"]+)\/([^"/]+)"/
    );
    if (!repoMatch) continue;
    const owner = repoMatch[1];
    const repo = repoMatch[2];
    if (!owner || !repo) continue;

    const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const description = descMatch && descMatch[1] ? stripTags(descMatch[1]) : "";

    const langMatch = block.match(
      /<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/
    );
    const language = langMatch && langMatch[1] ? langMatch[1].trim() : "";

    // Star / fork counts: GitHub renders these as <a>text "1,234"</a>. The
    // HTML between the tags has tons of whitespace + SVG; we strip tags then
    // pull the first integer-looking token (possibly with commas). The old
    // regex `.replace(/[^\d]/g, "")` would concatenate "1,234" + "5,678" =
    // 12345678 across both star + fork blocks if matched together.
    const stars = parseCountFromAnchor(block, "stargazers");
    const forks = parseCountFromAnchor(block, "forks");

    // "Stars today" sits in a span with class "d-inline-block float-sm-right".
    // Same gotcha — strip tags first, then take leading integer.
    const todayMatch = block.match(
      /<span[^>]*class="[^"]*d-inline-block[^"]*float-sm-right[^"]*"[^>]*>([\s\S]*?)<\/span>/
    );
    const starsToday =
      todayMatch && todayMatch[1] ? parseLeadingInt(stripTags(todayMatch[1])) : 0;

    repos.push({
      id: `${owner}/${repo}`,
      title: `${owner} / ${repo}`,
      url: `https://github.com/${owner}/${repo}`,
      description,
      stars,
      forks,
      stars_today: starsToday,
      language,
      author_handle: owner,
    });
  }

  return { repos, fetched_at: Math.floor(Date.now() / 1000) };
}

function stripTags(html: string): string {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse the first integer-looking token (may contain commas) from a string. */
function parseLeadingInt(s: string): number {
  const m = s.match(/[\d,]+/);
  if (!m) return 0;
  const n = parseInt(m[0].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseCountFromAnchor(block: string, kind: "stargazers" | "forks"): number {
  const re = new RegExp(
    `<a[^>]*href="\\/[^/"]+\\/[^/"]+\\/${kind}"[^>]*>([\\s\\S]*?)<\\/a>`
  );
  const m = block.match(re);
  if (!m || !m[1]) return 0;
  return parseLeadingInt(stripTags(m[1]));
}
