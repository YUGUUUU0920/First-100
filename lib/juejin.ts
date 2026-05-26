/**
 * 掘金 (juejin.cn) recent-articles client.
 *
 * v0 only uses the public timeline endpoint:
 *   POST https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed
 *
 * Returns the latest articles in a category. No auth required; rate limit
 * unobserved but generous (the public web feed hits this endpoint).
 *
 * Categories of interest for our indie-hacker / AI-product audience:
 *   - 6809637767543259144   "后端"
 *   - 6809637769959178254   "前端"
 *   - 6809637776263217160   "AI"
 *   - 6809637767543259144   "Android"  (skip)
 * The dashboard exposes the labels (`backend`, `frontend`, `ai`) — we map
 * to category IDs server-side.
 */

const JUEJIN_API =
  "https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed";

// Category ids verified live against juejin's tag_api/v1/query_category_list
// on 2026-05-26. Two were wrong:
//   - ai was 6809637776263217160 — that's actually 代码人生 (career), not 人工智能.
//     juejin's AI scans were silently pulling career posts.
//   - frontend was 6809637767539130382 — stale, returns data:null. Real id below.
export const JUEJIN_CATEGORIES = {
  ai: { id: "6809637773935378440", label: "AI" },
  backend: { id: "6809637769959178254", label: "后端" },
  frontend: { id: "6809637767543259144", label: "前端" },
} as const;

export type JuejinCategory = keyof typeof JUEJIN_CATEGORIES;

export interface JuejinArticle {
  id: string;
  title: string;
  brief: string; // short excerpt
  url: string;
  author_id: string;
  author_handle: string;
  view_count: number;
  digg_count: number; // 点赞
  comment_count: number;
  ctime: number; // unix seconds
}

export class JuejinError extends Error {
  constructor(
    message: string,
    public readonly cause_kind:
      | "invalid_category"
      | "network"
      | "http_error"
      | "parse_error",
    public readonly status?: number
  ) {
    super(message);
    this.name = "JuejinError";
  }
}

export async function fetchJuejinFeed(
  category: JuejinCategory,
  limit = 20
): Promise<{ articles: JuejinArticle[]; fetched_at: number }> {
  if (!(category in JUEJIN_CATEGORIES)) {
    throw new JuejinError(
      `不支持的 category：${category}（仅: ${Object.keys(JUEJIN_CATEGORIES).join(", ")}）`,
      "invalid_category"
    );
  }
  const cat = JUEJIN_CATEGORIES[category];

  let response: Response;
  try {
    response = await fetch(JUEJIN_API, {
      method: "POST",
      headers: {
        "User-Agent": "First100/0.1 (+https://yourfirst100.co)",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        cate_id: cat.id,
        cursor: "0",
        limit,
        id_type: 2,
        sort_type: 300, // 300 = 最新（latest）, 200 = 综合（recommended mix）
      }),
      cache: "no-store",
    });
  } catch (err) {
    throw new JuejinError(
      `连不上 juejin.cn：${err instanceof Error ? err.message : String(err)}`,
      "network"
    );
  }

  if (!response.ok) {
    throw new JuejinError(
      `juejin 返回 ${response.status}`,
      "http_error",
      response.status
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    throw new JuejinError(
      `juejin 响应不是 JSON：${err instanceof Error ? err.message : String(err)}`,
      "parse_error"
    );
  }

  const data = (raw as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    throw new JuejinError("juejin 响应 data 不是数组", "parse_error");
  }

  const articles: JuejinArticle[] = [];
  for (const row of data) {
    const article = (row as { article_info?: Record<string, unknown> }).article_info;
    const author = (row as { author_user_info?: Record<string, unknown> }).author_user_info;
    if (!article || !author) continue;
    const aid = article.article_id;
    const title = article.title;
    const brief = article.brief_content;
    const ctime = Number(article.ctime);
    if (typeof aid !== "string" || typeof title !== "string") continue;
    articles.push({
      id: aid,
      title,
      brief: typeof brief === "string" ? brief : "",
      url: `https://juejin.cn/post/${aid}`,
      author_id: typeof author.user_id === "string" ? author.user_id : "",
      author_handle: typeof author.user_name === "string" ? author.user_name : "",
      view_count: Number(article.view_count) || 0,
      digg_count: Number(article.digg_count) || 0,
      comment_count: Number(article.comment_count) || 0,
      ctime: Number.isFinite(ctime) ? ctime : Math.floor(Date.now() / 1000),
    });
  }

  return { articles, fetched_at: Math.floor(Date.now() / 1000) };
}

/** Match V2EX's helper so the scan endpoint can compute uniformly. */
export function ageDays(createdUnixSec: number): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, nowSec - createdUnixSec);
  return Math.floor(diffSec / 86400);
}
