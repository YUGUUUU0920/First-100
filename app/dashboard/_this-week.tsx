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
          你发出了 <Stat n={stats.sent} /> 条破冰 · 收到 <Stat n={stats.replied} /> 条回复 · 转化{" "}
          <Stat n={stats.converted} /> 个真实用户
        </p>
      ) : (
        <p className="mt-16 text-body text-fg-muted">
          本周还没记录任何"已发送"。
          {stats.prospects_added > 0 ? (
            <> 下面已经有 {stats.prospects_added} 个 AI 找到的潜在用户，复制破冰话术发出去之后，记得回来点"已发送 ↗"按钮。</>
          ) : (
            <> 用下面的"扫社区"或"粘贴帖子"功能，让 AI 给你找第一个潜在用户。</>
          )}
        </p>
      )}

      <div className="mt-24 flex flex-wrap items-center gap-12">
        <Button
          type="button"
          onClick={generatePoster}
          disabled={busy}
          variant="ghost"
          title="生成一张本周战绩的图片，可以发即刻动态 / 朋友圈"
        >
          {busy ? "渲染中..." : "生成本周战绩图（发动态用）"}
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
