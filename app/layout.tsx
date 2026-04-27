import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
});

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
    <html lang="zh-CN" className={`${inter.variable} ${notoSansSC.variable}`}>
      <body className="font-sans text-body text-fg bg-bg antialiased">
        {children}
      </body>
    </html>
  );
}
