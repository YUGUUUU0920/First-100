import { ImageResponse } from "next/og";

/**
 * Default Open Graph share image — used when First 100 is shared on Twitter,
 * 即刻, WeChat, etc.  Same forest-green identity as the poster + icon.
 *
 * Next.js 15 auto-discovers app/opengraph-image.tsx and applies it as the
 * default og:image for every route, unless a route exports its own.
 */
export const alt = "First 100 — 你的前 100 个用户，值得你亲手拿下";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          background: "#fafaf8",
          color: "#0a0a0a",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, color: "#4a4a48" }}>
          First 100
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            maxWidth: 920,
          }}
        >
          <span>你的前 100 个用户，</span>
          <span>值得你亲手拿下</span>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 28,
            color: "#4a4a48",
            display: "flex",
            gap: 16,
          }}
        >
          <span>5 分钟扫 V2EX + 即刻</span>
          <span style={{ color: "#8b8a86" }}>·</span>
          <span>AI 个性化中文破冰</span>
          <span style={{ color: "#8b8a86" }}>·</span>
          <span>你按发送</span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            color: "#8b8a86",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              background: "#1d5a3a",
              color: "#fafaf8",
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 8,
              letterSpacing: "-0.04em",
            }}
          >
            F1
          </div>
          <span>yourfirst100.co</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
