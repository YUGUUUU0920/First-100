/**
 * V2EX read-only API client.
 *
 * v0 only uses the public list endpoint:
 *   GET /api/topics/show.json?node_name=<name>
 *
 * Returns up to 20 latest topics in a node (V2EX-imposed limit, not paginated
 * in v1 API). Free, no auth, no quota beyond the global 60 req/min IP cap.
 *
 * Per CEO plan: one list call per scan = 5 calls/day per user is well below
 * the cap, so no token-bucket needed for v0. Per-user 5 scans/day enforced
 * separately in the scan endpoint via the `scans` table.
 */

const V2EX_API = "https://www.v2ex.com/api/topics/show.json";
const NODE_NAME_RE = /^[a-z0-9][a-z0-9-]{0,32}$/;

export interface V2EXTopic {
  id: number;
  title: string;
  url: string;
  content: string;
  content_rendered: string;
  replies: number;
  created: number;
  last_modified: number;
  last_touched: number;
  member: { id: number; username: string };
  node: { id: number; name: string; title: string };
}

export interface V2EXFetchResult {
  topics: V2EXTopic[];
  fetched_at: number;
}

export class V2EXError extends Error {
  constructor(
    message: string,
    public readonly cause_kind:
      | "invalid_node"
      | "network"
      | "http_error"
      | "parse_error",
    public readonly status?: number
  ) {
    super(message);
    this.name = "V2EXError";
  }
}

/**
 * Fetch latest topics in a V2EX node by node name.
 *
 * Validates node name against V2EX's slug format before making the request
 * to keep us from accidentally calling untrusted URLs.
 */
export async function fetchNodeTopics(nodeName: string): Promise<V2EXFetchResult> {
  if (!NODE_NAME_RE.test(nodeName)) {
    throw new V2EXError(
      `节点名格式不对：${nodeName}（只允许小写字母 / 数字 / 短横线）`,
      "invalid_node"
    );
  }

  const url = new URL(V2EX_API);
  url.searchParams.set("node_name", nodeName);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        // V2EX rejects requests with default `node-fetch` / unbranded UAs.
        "User-Agent": "First100/0.1 (+https://yourfirst100.co)",
        Accept: "application/json",
      },
      // Don't cache scans — we want fresh topics every time.
      cache: "no-store",
    });
  } catch (err) {
    throw new V2EXError(
      `连不上 V2EX：${err instanceof Error ? err.message : String(err)}`,
      "network"
    );
  }

  if (!response.ok) {
    throw new V2EXError(
      `V2EX 返回 ${response.status}（节点 ${nodeName} 可能不存在）`,
      "http_error",
      response.status
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    throw new V2EXError(
      `V2EX 响应不是 JSON：${err instanceof Error ? err.message : String(err)}`,
      "parse_error"
    );
  }

  if (!Array.isArray(raw)) {
    throw new V2EXError("V2EX 响应不是数组", "parse_error");
  }

  const topics = raw.filter(isV2EXTopic);
  return { topics, fetched_at: Math.floor(Date.now() / 1000) };
}

function isV2EXTopic(value: unknown): value is V2EXTopic {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.title === "string" &&
    typeof v.url === "string" &&
    typeof v.content === "string" &&
    typeof v.replies === "number" &&
    typeof v.created === "number" &&
    typeof v.member === "object" &&
    v.member !== null &&
    typeof (v.member as Record<string, unknown>).username === "string" &&
    typeof v.node === "object" &&
    v.node !== null &&
    typeof (v.node as Record<string, unknown>).name === "string"
  );
}

/**
 * Days between V2EX `created` (unix seconds) and now. Returned as integer.
 * Persisted on `prospects.post_age_days` for the dashboard's recency display.
 */
export function ageDays(createdUnixSec: number): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, nowSec - createdUnixSec);
  return Math.floor(diffSec / 86400);
}
