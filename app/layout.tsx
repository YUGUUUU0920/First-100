import type { Metadata } from "next";
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
  openGraph: {
    title: "First 100",
    description: "你的前 100 个用户，值得你亲手拿下。",
    locale: "zh_CN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans text-body text-fg bg-bg antialiased">
        {children}
      </body>
    </html>
  );
}
