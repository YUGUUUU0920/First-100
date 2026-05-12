/**
 * 少数派 (sspai.com) Matrix API client.
 *
 * Matrix = user-generated articles by indie makers / tools / productivity
 * authors. Distinct from the editor-written 派早报 stuff we DON'T want.
 *
 * Endpoint:
 *   GET https://sspai.com/api/v1/article/index/page/get
 *   ?limit=N&offset=0&created_at=0&tag=<标签>
 *
 * Tags worth scanning for First 100's audience:
 *   开发 / 工具 / 效率 / 创业 / AI / 自动化 / 独立开发
 * sspai surfaces tags by Chinese name (URL-encoded), so we keep them as
 * full Chinese strings rather than slugs.
 */

const SSPAI_API = "https://sspai.com/api/v1/article/index/page/get";

export const SSPAI_TAGS = {
  开发: "开发",
  工具: "工具",
  效率: "效率",
  创业: "创业",
  AI: "AI",
  自动化: "自动化",
  独立开发: "独立开发",
} as const;

export type SspaiTag = keyof typeof SSPAI_TAGS;

export interface SspaiArticle {
  id: number;
  title: string;
  summary: string;
  url: string;
  author_slug: string;
  author_nickname: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  released_at: number; // unix seconds
}

export class SspaiError extends Error {
  constructor(
    message: string,
    public readonly cause_kind: "invalid_tag" | "network" | "http_error" | "parse_error",
    public readonly status?: number
  ) {
    super(message);
    this.name = "SspaiError";
  }
}

export async function fetchSspaiMatrix(
  tag: SspaiTag,
  limit = 20
): Promise<{ articles: SspaiArticle[]; fetched_at: number }> {
  if (!(tag in SSPAI_TAGS)) {
    throw new SspaiError(
      `不支持的少数派 tag：${tag}（仅 ${Object.keys(SSPAI_TAGS).join(" / ")}）`,
      "invalid_tag"
    );
  }

  const url = new URL(SSPAI_API);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("created_at", "0");
  url.searchParams.set("tag", tag);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "First100/0.1 (+https://yourfirst100.co)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new SspaiError(
      `连不上 sspai.com：${err instanceof Error ? err.message : String(err)}`,
      "network"
    );
  }

  if (!response.ok) {
    throw new SspaiError(
      `sspai 返回 ${response.status}`,
      "http_error",
      response.status
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    throw new SspaiError(
      `sspai 响应不是 JSON：${err instanceof Error ? err.message : String(err)}`,
      "parse_error"
    );
  }

  const list = (raw as { data?: unknown }).data;
  if (!Array.isArray(list)) {
    throw new SspaiError("sspai 响应 data 不是数组", "parse_error");
  }

  const articles: SspaiArticle[] = [];
  for (const row of list) {
    const r = row as Record<string, unknown>;
    const author = (r.author as Record<string, unknown>) ?? {};
    if (typeof r.id !== "number" || typeof r.title !== "string") continue;
    articles.push({
      id: r.id,
      title: r.title,
      summary: typeof r.summary === "string" ? r.summary : "",
      url: `https://sspai.com/post/${r.id}`,
      author_slug: typeof author.slug === "string" ? author.slug : "",
      author_nickname: typeof author.nickname === "string" ? author.nickname : "",
      view_count: Number(r.view_count) || 0,
      like_count: Number(r.like_count) || 0,
      comment_count: Number(r.comment_count) || 0,
      released_at: Number(r.released_time) || Math.floor(Date.now() / 1000),
    });
  }

  return { articles, fetched_at: Math.floor(Date.now() / 1000) };
}

export function ageDays(createdUnixSec: number): number {
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.floor(Math.max(0, nowSec - createdUnixSec) / 86400);
}
