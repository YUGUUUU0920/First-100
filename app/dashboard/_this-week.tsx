"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { WeeklyStats } from "@/lib/weekly-stats";

interface ThisWeekProps {
  stats: WeeklyStats;
  streak: number;
}

interface PosterResponse {
  ok?: boolean;
  iso_week?: string;
  signed_url?: string;
  error?: { code: string; message: string };
}

export function ThisWeek({ stats, streak }: ThisWeekProps) {
  const [busy, setBusy] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generatePoster() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/poster/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as PosterResponse;
      if (!res.ok || !json.signed_url) {
        setError(json.error?.message ?? `HTTP ${res.status}`);
      } else {
        setPosterUrl(json.signed_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络出错");
    } finally {
      setBusy(false);
    }
  }

  const hasActivity = stats.sent > 0 || stats.replied > 0 || stats.converted > 0;

  return (
    <div className="rule pt-32 mt-48">
      <div className="flex items-baseline justify-between gap-16">
        <h2 className="text-h2 font-semibold text-fg">本周（{stats.iso_week}）</h2>
        {streak > 0 && (
          <span className="text-meta text-fg-muted tabular-nums">
            🟢 第 {streak} 周连续
          </span>
        )}
      </div>

      {hasActivity ? (
        <p className="mt-16 text-body lg:text-body-lg text-fg-muted">
          你发了 <Stat n={stats.sent} /> 条 · 回了 <Stat n={stats.replied} /> 条 · 转化{" "}
          <Stat n={stats.converted} /> 个
        </p>
      ) : (
        <p className="mt-16 text-body text-fg-muted">
          这周还没标过 sent。本周已加 {stats.prospects_added} 个 prospect。复制 → 发出去 → 回来标。
        </p>
      )}

      <div className="mt-24 flex flex-wrap items-center gap-12">
        <Button
          type="button"
          onClick={generatePoster}
          disabled={busy}
          variant="ghost"
        >
          {busy ? "渲染中..." : "生成本周海报"}
        </Button>

        {posterUrl && (
          <>
            <a
              href={posterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline"
            >
              打开 / 下载
            </a>
            <a
              href={posterUrl}
              download={`first100-${stats.iso_week}.png`}
              className="text-meta text-fg-muted hover:text-fg underline-offset-4 hover:underline"
            >
              保存到本地
            </a>
          </>
        )}

        {error && (
          <span className="text-meta text-fg" role="alert">
            {error}
          </span>
        )}
      </div>

      {posterUrl && (
        <div className="mt-24 max-w-[360px]">
          {/* 1080×1350 source — shown at 360×450 preview */}
          <img
            src={posterUrl}
            alt={`${stats.iso_week} 战绩海报`}
            width={1080}
            height={1350}
            className="w-full h-auto border border-rule rounded-md"
          />
          <p className="mt-8 text-meta text-fg-quiet">
            长按图片保存到相册 → 即刻发动态时附图。signed URL 30 天有效。
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ n }: { n: number }) {
  return <span className="text-fg font-semibold tabular-nums">{n}</span>;
}
