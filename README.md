# First 100

AI 帮中文 indie hacker 找前 100 个用户。

输入产品描述 → 5 分钟内 AI 扫 V2EX + 你粘即刻帖子 → 个性化中文破冰 → 你按发送 → 每周战绩海报。

- 📄 设计：`DESIGN.md`（视觉 + interaction states）
- 📐 CEO plan：`~/.gstack/projects/YUGUUUU0920-First-100/ceo-plans/2026-04-22-first-100-chinese-pivot.md`
- 🏗️  状态：v0 Lane A 完。可登录 / 创建产品 / 扫 V2EX / 即刻粘贴 / Sonnet outreach / 标 sent-replied-converted / 周报海报 / streak counter。pre-deploy。

## 原则（不可违反）

1. **人在 loop 中是 feature 不是 bug** — v0 不自动发送
2. **成功指标 = 当周发送后被回复数**，不是 DAU
3. **Founder = User #1** — Founder 自己每周不用，产品死

## 技术栈

- **Next.js 15**（App Router） + TypeScript strict + Tailwind 3
- **Supabase**（Postgres + Auth + Storage） — magic link 登录走 Resend SMTP
- **Anthropic Claude SDK** — Haiku 4.5 过滤 / critique，Sonnet 4.6 outreach 生成
- **@vercel/og** — 1080×1350 周报海报（Satori JSX → PNG）
- **V2EX read API** — 公开节点 list 接口，无 auth
- **即刻**：用户长按复制帖子 → 粘到 dashboard

## Quick start

```bash
bun install
cp .env.example .env.local   # 填 Supabase / Anthropic / Resend keys
bun run dev                  # → http://localhost:3000
```

需要的 env：
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`
- `ANTHROPIC_API_KEY`（[console.anthropic.com](https://console.anthropic.com)）
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL`（自有发件域名）
- `NEXT_PUBLIC_SITE_URL`（dev: `http://localhost:3000`，prod: 部署地址）
- `CRON_SECRET`（cron 路由鉴权，prod 必填）

部署后还要做的：
1. 在 Supabase 控制台 enable `pg_cron` + `pg_net` extensions
2. 跑 `supabase/migrations/0003_posters_storage.sql`（建 `posters` bucket）
3. 跑 `supabase/migrations/0004_pg_cron_weekly_poster.sql`（设周一 9:00 海报 cron）
4. 设 `vault.secrets.cron_target_url` 和 `vault.secrets.cron_secret`

## 项目结构

```
app/
  api/
    scan/                  POST 触发 V2EX 扫描 + AI pipeline
    poster/generate        生成本周战绩海报（用户手动）
    cron/weekly-poster     pg_cron 触发，遍历 active users 出海报
    claude-ping            Claude 连通性 smoke test
  auth/                    Supabase magic link callback / confirm / signout action
  dashboard/               主界面：本周 + 扫描表单 + 即刻粘贴 + prospect 列表
  products/new/            创建产品表单
  login/                   Magic link 登录
  globals.css              DESIGN.md tokens + skip-link + tabular-nums utilities
  layout.tsx / icon.tsx / opengraph-image.tsx   meta + 品牌资产
  not-found.tsx / error.tsx                      branded 404 + 错误边界
lib/
  claude/                  Anthropic SDK + 版本化 prompts + filter / generate helpers
  v2ex.ts                  V2EX 公开 list API client
  supabase/                user-cookie + admin client（admin 绕过 RLS 用于服务器写）
  poster.tsx               @vercel/og 海报渲染
  weekly-stats.ts          Shanghai-week bounds + outreach event 聚合 + streak
supabase/migrations/       SQL schema + storage bucket + pg_cron job
scripts/smoke.ts           AI pipeline 端到端 smoke test（脱离 server / browser）
```

## 测一下整套 pipeline

```bash
bun run smoke            # 5 check：V2EX → Haiku → Sonnet → 海报 (~$0.02)
bun run eval             # Haiku 过滤 precision/recall vs docs/eval/*.md 标签
bun x tsc --noEmit       # typecheck
bun run build            # full Next.js build
```

`bun run smoke` 改 prompt 后必跑。`bun run eval` 等你在 `docs/eval/relevance-filter-samples.md` 标完 ≥15 relevant + ≥15 not_relevant 后再跑。CI 上不要默认开（API 成本累积）。

## Founder-only 仪表盘 `/admin`

设 `FOUNDER_EMAILS=your@email,co@email` 在 `.env.local`，然后访问 `/admin` 看 5 个观测面板：
- 每用户 7 天扫描次数 + 累计 AI 成本
- 本周 outreach 失败率
- 激活漏斗（signup → product → scan → sent → replied）
- 最近周报海报（cron 成功率代理）
- 邮件送达率（待 Resend webhook 接好）

非 allowlist 访问 → 404（不暴露存在）。

## Prospect 列表过滤

Dashboard URL 参数：
- `?min_score=6` 只看 AI 相关性 ≥6/10 的（0 / 4 / 6 / 8 四档）
- `?status=awaiting_reply` 只看已发未回的（`all` / `not_sent` / `awaiting_reply` / `replied` / `converted`）

每个过滤项旁显示实时计数，从左到右读 = 当下的 funnel 转化率。

## 贡献 / 改 prompt

每个 prompt 都有 `*_VERSION` 常量（`lib/claude/prompts.ts`）。改 prompt = 必须 bump 版本号，
这样旧数据库行能通过 `outreaches.critique_feedback` 前缀（如 `[gen-v2|critique-v1]`）
看出来用的是哪版 prompt。

## 发布 / 部署

**目前未部署。** 计划路径：
1. `/ship`（gstack）merge 到 main + 开 PR
2. Vercel 接 GitHub repo（自动部署 main 分支）
3. Vercel 项目 region pin `hkg1`（已在 `vercel.json`）
4. Supabase 跑 migrations 0003 + 0004
5. `/canary`（gstack）部署后监控

## 已知限制（v0 故意没做）

- 没有 daily scan limit（founder testing 阶段，第一个 paying user 时加回）
- 没有 idempotency window（同上）
- 即刻粘贴不验证 URL 来源域名（信任用户输入）
- Outreach prompt 还没 fine-tune（基线 v2，Open Decision 3 标 30+30 样本后 v3）
- 没有 Reddit / Twitter（v0.5 英文市场扩张时再加）
- 没有自动发送（永远不做 — 人在 loop 中是 feature）
