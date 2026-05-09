import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Fonts: relying on the OS-installed CJK stack defined in tailwind.config.ts
 * (PingFang SC on macOS, Microsoft YaHei on Windows, system-ui fallback).
 *
 * We deliberately do NOT load Inter / Noto Sans SC from Google Fonts because
 * fonts.googleapis.com is unreachable from China-mainland networks without a
 * proxy, which made every dev page hang for 30+ seconds on font-fetch retries.
 *
 * If we want the exact Noto Sans SC look in production, swap in a self-hosted
 * `@next/font/local` config or a China-friendly mirror (e.g., bunny.net).
 */

export const metadata: Metadata = {
  title: "First 100 — 你的前 100 个用户，值得你亲手拿下",
  description:
    "AI-native 用户获取助手 for Chinese indie makers. 即刻 + V2EX 一次扫描，AI 写个性化中文破冰，你自己按发送。",
  applicationName: "First 100",
  keywords: ["indie hacker", "冷启动", "用户获取", "中文 SaaS", "AI 营销"],
  authors: [{ name: "First 100" }],
  creator: "First 100",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "First 100 — 你的前 100 个用户，值得你亲手拿下",
    description:
      "5 分钟扫 V2EX + 即刻，AI 写个性化中文破冰。你按发送。一周一次复盘。",
    locale: "zh_CN",
    type: "website",
    siteName: "First 100",
  },
  twitter: {
    card: "summary_large_image",
    title: "First 100",
    description: "你的前 100 个用户，值得你亲手拿下。",
  },
  // Once we have favicon assets in /public, Next.js auto-discovers favicon.ico
  // and apple-icon.png from /app or /public. /app/icon.tsx supersedes those.
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#1d5a3a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans text-body text-fg bg-bg antialiased">
        {/* Skip link — keyboard users tab once at top of page to jump past the
            nav. Visible only when focused (.skip-link styles in globals.css). */}
        <a href="#main" className="skip-link">
          跳到主内容
        </a>
        {children}
      </body>
    </html>
  );
}
