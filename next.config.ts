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
const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default config;
