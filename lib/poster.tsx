import { ImageResponse } from "@vercel/og";
import type { WeeklyStats } from "./weekly-stats";

export interface PosterInput {
  productDisplayName: string;
  stats: WeeklyStats;
  weekIndex: number; // "第 X 周" — connected weeks the founder has been active
}

/**
 * Renders the weekly poster as a 1080×1350 PNG.
 *
 * Style per DESIGN.md §4 (海报):
 *   - Solid forest-green background (#1d5a3a)
 *   - White typography only — no illustrations, emojis, decoration
 *   - Big stat numbers in 96px font weight 700
 *   - Bottom-right: First 100 logo + URL
 *
 * The image is plain typography on color, intentionally distinct from
 * other 即刻 feed content (which is screenshots / lifestyle photos).
 */
export async function renderWeeklyPoster(input: PosterInput): Promise<Response> {
  const { productDisplayName, stats, weekIndex } = input;
  const isEmpty = stats.sent === 0 && stats.replied === 0 && stats.converted === 0;
  const headline = isEmpty ? "这周还没开始" : `第 ${weekIndex} 周战绩`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          backgroundColor: "#1d5a3a",
          color: "#fafaf8",
          padding: "96px",
          display: "flex",
          flexDirection: "column",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "32px", fontWeight: 400, opacity: 0.7 }}>
            你的前 100 个用户
          </div>
          <div style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.1 }}>
            {headline}
          </div>
        </div>

        {/* Hairline */}
        <div
          style={{
            marginTop: "64px",
            marginBottom: "64px",
            height: "1px",
            backgroundColor: "#fafaf8",
            opacity: 0.4,
          }}
        />

        {/* Stats */}
        {isEmpty ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              fontSize: "32px",
              fontWeight: 400,
              opacity: 0.85,
              flex: 1,
            }}
          >
            <div>离周日还有几天，加油。</div>
            <div>
              本周已加 {stats.prospects_added} 个 prospect 到列表，
            </div>
            <div>但还没标过 sent。</div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "48px",
              flex: 1,
            }}
          >
            <StatRow value={stats.sent} label="条 outreach 发出" />
            <StatRow value={stats.replied} label="条收到回复" />
            <StatRow value={stats.converted} label="个加了微信 / 真试用" />
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: "20px",
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontWeight: 600 }}>{productDisplayName}</div>
            <div style={{ opacity: 0.7 }}>{stats.iso_week}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <div style={{ fontWeight: 600 }}>First 100</div>
            <div style={{ opacity: 0.7 }}>yourfirst100.co</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  );
}

function StatRow({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "32px" }}>
      <div
        style={{
          fontSize: "144px",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "32px", fontWeight: 400, opacity: 0.85 }}>{label}</div>
    </div>
  );
}
