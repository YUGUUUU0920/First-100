import type { NextConfig } from "next";
import path from "node:path";

/**
 * `outputFileTracingRoot` pin: when this project is checked out as a git
 * worktree (e.g., `.claude/worktrees/<name>/`), Next.js detects two bun.lock
 * files (worktree + parent) and warns that workspace root is ambiguous,
 * defaulting to the parent. That breaks env-loading expectations and noises
 * up dev logs. Pinning to __dirname forces this project directory as the
 * workspace root regardless of how it was checked out.
 */
/**
 * Baseline security headers (/cso A05 — Security Misconfiguration).
 * Vercel adds HSTS; everything else is on us. We intentionally do NOT set a
 * strict Content-Security-Policy here: Next.js emits inline bootstrap scripts,
 * framer-motion injects inline styles, and @vercel/og needs its own origins —
 * a locked-down CSP needs nonce plumbing and risks white-screening the app, so
 * that's a separate, supervised change. These four headers are safe + standard.
 */
const SECURITY_HEADERS = [
  // Clickjacking: don't allow the app to be framed by other origins.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIME sniffing: trust declared Content-Type, don't guess.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer leakage: send origin only on cross-origin, full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default config;
