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

// Real V2EX node slugs verified 2026-04-28. Order: indie-density first.
const SUGGESTED_NODES = [
  "create",      // 分享创造 — indie 主力
  "ideas",       // 突发奇想
  "sidehustle",  // 副业
  "share",       // 分享发现
  "saashub",     // SaaSHub
  "aisaas",      // AI SaaS
  "product",     // 产品发布
  "programmer",  // 程序员
];

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
  const [node, setNode] = useState("create");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, node }),
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
      <h2 className="text-h2 font-semibold text-fg">扫一次 V2EX</h2>
      <p className="mt-12 text-sub text-fg-muted">
        从某个 V2EX 节点抓最新 20 帖，AI 过滤出可能的潜在用户。每天上限 5 次。
      </p>

      <div className="mt-24 flex flex-col sm:flex-row gap-12 items-stretch sm:items-end">
        <div className="flex-1">
          <label htmlFor="node" className="block text-sub text-fg-muted mb-8">
            节点名（v2ex.com/go/<span className="text-fg">xxx</span>）
          </label>
          <input
            id="node"
            name="node"
            type="text"
            value={node}
            onChange={(e) => setNode(e.target.value.trim().toLowerCase())}
            disabled={isWorking}
            required
            pattern="[a-z0-9][a-z0-9-]{0,31}"
            placeholder="create"
            className="w-full px-16 py-12 text-body bg-bg border border-rule rounded-md text-fg placeholder:text-fg-quiet focus:outline-none focus:border-fg transition-colors disabled:opacity-50 font-mono"
          />
        </div>
        <Button type="submit" disabled={isWorking} variant="primary">
          {isWorking ? "扫描中..." : "扫一次"}
        </Button>
      </div>

      <div className="mt-16 flex flex-wrap gap-8">
        <span className="text-meta text-fg-quiet">推荐节点：</span>
        {SUGGESTED_NODES.map((n) => (
          <button
            key={n}
            type="button"
            disabled={isWorking}
            onClick={() => setNode(n)}
            className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline disabled:opacity-50"
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
    { label: "抓 V2EX 节点列表", until: 1 },
    { label: "Haiku 过滤相关性（并发 ~20 条）", until: 2 },
    { label: "Sonnet 写中文破冰 + critique", until: 3 },
    { label: "写入数据库", until: 4 },
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
