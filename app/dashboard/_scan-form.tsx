"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface ScanFormProps {
  productId: string;
}

interface ScanResponse {
  scan_id?: string;
  scanned?: number;
  kept?: number;
  ai_failed?: number;
  cost_cents?: number;
  idempotent?: boolean;
  finished?: boolean;
  error?: { code: string; message: string };
}

type Source = "v2ex" | "juejin" | "sspai" | "github-cn";

const SOURCE_LABEL: Record<Source, string> = {
  v2ex: "V2EX",
  juejin: "掘金",
  sspai: "少数派",
  "github-cn": "GitHub 中文",
};

// What to put on the input label — source-specific, no jargon.
const INPUT_LABEL: Record<Source, string> = {
  v2ex: "扫 V2EX 哪个节点？",
  juejin: "扫掘金哪个分类？",
  sspai: "扫少数派哪个标签？",
  "github-cn": "看多长时间内的趋势？",
};

// Helper sentence beneath the label — what the input means in plain Chinese.
const INPUT_HELP: Record<Source, string> = {
  v2ex: "节点 = V2EX 网址 v2ex.com/go/ 后面那段。比如「分享创造」节点的 URL 是 v2ex.com/go/create，就填 create。",
  juejin: "掘金把内容分成 AI / 后端 / 前端 三类，填一个英文 key。",
  sspai: "少数派矩阵区的标签，直接填中文，比如「开发」「AI」「创业」。",
  "github-cn": "daily = 今天最热 · weekly = 本周最热 · monthly = 本月最热。",
};

const SUGGESTIONS: Record<Source, readonly string[]> = {
  v2ex: [
    "create",      // 分享创造 — indie 主力
    "ideas",       // 突发奇想
    "sidehustle",  // 副业
    "share",       // 分享发现
    "saashub",     // SaaSHub
    "aisaas",      // AI SaaS
    "product",     // 产品发布
    "programmer",  // 程序员
  ],
  juejin: ["ai", "backend", "frontend"],
  sspai: ["开发", "工具", "效率", "创业", "AI", "自动化", "独立开发"],
  "github-cn": ["daily", "weekly", "monthly"],
};

const SUGGESTION_LABEL: Partial<Record<Source, string>> = {
  v2ex: "试这些常用节点：",
  juejin: "三个分类全在这：",
  sspai: "常用标签：",
  "github-cn": "选时间窗口：",
};

const SOURCE_DEFAULT: Record<Source, string> = {
  v2ex: "create",
  juejin: "ai",
  sspai: "AI",
  "github-cn": "daily",
};

/**
 * Triggers POST /api/scan and refreshes the page on success.
 *
 * Behaviour:
 *   - Disables button during the call (Edge function takes ~10-15s for 20 topics)
 *   - Shows inline error on 4xx/5xx
 *   - Calls router.refresh() on success so the new prospects render via RSC
 */
export function ScanForm({ productId }: ScanFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Source>("v2ex");
  const [node, setNode] = useState("create");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setSourceWithDefault(s: Source) {
    setSource(s);
    setNode(SOURCE_DEFAULT[s]);
  }

  const suggestions = SUGGESTIONS[source];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, source, node }),
      });
      const json = (await res.json()) as ScanResponse;
      if (!res.ok || json.error) {
        setError(json.error?.message ?? `HTTP ${res.status}`);
      } else {
        setResult(json);
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络出错");
    } finally {
      setBusy(false);
    }
  }

  const isWorking = busy || pending;

  return (
    <form onSubmit={onSubmit} className="rule pt-32 mt-48">
      <h2 className="text-h2 font-semibold text-fg">扫社区找潜在用户</h2>
      <p className="mt-12 text-sub text-fg-muted">
        从中文社区抓最新 20 帖 → AI 挑出真的在讨论你产品相关问题的人 → 给每个写一句中文破冰话术。
        大约 15 秒。
      </p>

      {/* Source picker */}
      <div className="mt-24">
        <p className="text-sub text-fg-muted mb-8">1. 在哪里扫？</p>
        <div className="inline-flex border border-rule rounded-md overflow-hidden flex-wrap">
          {(["v2ex", "juejin", "sspai", "github-cn"] as const).map((s) => {
            const active = source === s;
            return (
              <button
                key={s}
                type="button"
                disabled={isWorking}
                onClick={() => setSourceWithDefault(s)}
                className={[
                  "text-sub px-16 py-8 transition-colors",
                  active ? "bg-fg text-bg" : "text-fg-muted hover:bg-fg/[0.06]",
                  "disabled:opacity-50",
                ].join(" ")}
              >
                {SOURCE_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-24">
        <label htmlFor="node" className="block text-sub text-fg-muted mb-8">
          2. {INPUT_LABEL[source]}
        </label>
        <p className="text-meta text-fg-quiet mb-8">{INPUT_HELP[source]}</p>
        <div className="flex flex-col sm:flex-row gap-12 items-stretch sm:items-end">
          <input
            id="node"
            name="node"
            type="text"
            value={node}
            onChange={(e) => {
              // sspai tags are Chinese — don't lowercase those
              const v = source === "sspai" ? e.target.value.trim() : e.target.value.trim().toLowerCase();
              setNode(v);
            }}
            disabled={isWorking}
            required
            placeholder={SOURCE_DEFAULT[source]}
            className="flex-1 px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50 font-mono"
          />
          <Button type="submit" disabled={isWorking} variant="primary">
            {isWorking ? "扫描中..." : "扫一次"}
          </Button>
        </div>
      </div>

      <div className="mt-16 flex flex-wrap gap-8 items-center">
        <span className="text-meta text-fg-quiet">{SUGGESTION_LABEL[source] ?? "试这些："}</span>
        {suggestions.map((n) => (
          <button
            key={n}
            type="button"
            disabled={isWorking}
            onClick={() => setNode(n)}
            className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline disabled:opacity-50 font-mono"
          >
            {n}
          </button>
        ))}
      </div>

      {isWorking && <ScanProgress />}

      {error && !isWorking && (
        <div
          className="mt-16 px-16 py-12 border border-fg/15 rounded-md bg-fg/[0.03]"
          role="alert"
        >
          <p className="text-sub text-fg">{error}</p>
          <p className="mt-4 text-meta text-fg-quiet">
            没事，再点一次扫一下。如果一直失败，把这条信息发给我。
          </p>
        </div>
      )}
      {result && !error && !isWorking && (
        <div className="mt-16">
          <p className="text-sub text-fg-muted tabular-nums">
            扫了 {result.scanned ?? 0} 条 · 留了 {result.kept ?? 0} 条
            {result.ai_failed ? ` · ${result.ai_failed} 条 AI 没解析` : ""}
            {typeof result.cost_cents === "number" && result.cost_cents > 0
              ? ` · 花了 ${(result.cost_cents / 100).toFixed(3)} 美元`
              : ""}
            {result.idempotent ? "（60 秒内重复请求，返回上一次结果）" : ""}
          </p>
          {result.scanned && result.kept === 0 && !result.idempotent && (
            <p className="mt-8 text-meta text-fg-quiet">
              这次没扫出匹配的。换个节点再来一次？或者产品描述写得太泛，AI 没法判断相关性 ——
              到 <a href="/products/new" className="underline-offset-4 hover:underline hover:text-fg">/products/new</a> 改一下。
            </p>
          )}
        </div>
      )}
    </form>
  );
}

/**
 * Inline progress while a scan is in flight (~12-18s typical).  We can't
 * stream actual milestones from the server in v0, so we show a phase ladder
 * that advances on time — purely cosmetic, but signals "still alive" so the
 * user doesn't refresh mid-scan.
 */
function ScanProgress() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2500);
    const t2 = setTimeout(() => setPhase(2), 6500);
    const t3 = setTimeout(() => setPhase(3), 14000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const steps = [
    { label: "正在抓最新的帖子", until: 1 },
    { label: "AI 在过滤真的相关的（约 20 条）", until: 2 },
    { label: "AI 在给每条写中文破冰话术", until: 3 },
    { label: "保存到你的列表", until: 4 },
  ];

  return (
    <div className="mt-16 px-16 py-12 border border-rule rounded-md bg-fg/[0.02]">
      <ul className="space-y-4 text-sub">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-8 tabular-nums ${
              i < phase
                ? "text-fg-quiet"
                : i === phase
                  ? "text-fg"
                  : "text-fg-quiet/60"
            }`}
          >
            <span aria-hidden="true">
              {i < phase ? "✓" : i === phase ? "▸" : "·"}
            </span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
