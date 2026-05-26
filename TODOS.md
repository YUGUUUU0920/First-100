# TODOS

Long-running backlog. Items above the line are work that should ship soon. Items below are deferred for documented reasons — re-evaluate when the trigger condition is met.

## Active

### P-1 — Founder personal decisions (block all engineering, post-codex review 2026-05-12)

> Both items below are pre-conditions for the engineering work below. See
> `~/.gstack/projects/YUGUUUU0920-First-100/ceo-plans/2026-05-12-post-launch-strategic-review.md`
> § REVISION 1 for the full Codex challenge that surfaced these.

- [ ] **P-1a · Founder full-time vs Alibaba 副业灰区 — decide within 3 months**. Alibaba 员工副业受《员工行为准则》约束，需要书面申报且不得与公司业务竞争。SaaS-type 副业在灰区。所有公开 dogfood / 即刻品牌账号 / Twitter build-in-public 类 picks 都假设这件事已经解决。不解决 → 全部 picks 无法执行。Deadline: 2026-08-12.
- [ ] **P-1b · 数据合规审计 — 2 周内**. 评估 PIPL §41（个人信息处理需明确告知 + 单独同意）+ V2EX/即刻/小红书各自的 ToS。"抓陌生人帖子 + 用 AI 生成针对此人的破冰话术 + 卖给第三方" 这个业务模型在中国是否合法。需要 ~¥500-2000 找一个 IT 律师 1 小时咨询。不解决 → 跑到几百付费用户就关站。Deadline: 2026-05-26.

### P0 — must-do once P-1 resolved (post-codex revised)

- [ ] **Founder dogfood reframed**. 不是"周一 09:00 关门 30 min 吃狗粮"。而是 **用 First 100 给 First 100 自己拉前 50 个 paid 用户，过程公开（条件 P-1a 允许）或半匿名（条件 P-1a 不允许）**。一次解决 dogfood + 分发 + 信任三件事。原 review 把它们拆开丢了乘数。
- [x] ~~**Outreach features vector 完整埋点**~~ — **17 维已上线** (2026-05-22, loop tick 2；tick 11 修了 has_ps 中文漏检 bug)。`markOutreach` 每次标记抓 text shape (9) + prospect quality (5) + timing (3) 进 `outreach_events.features`。**仅剩 post-body embedding 维**待做 → 需 embedding API key，移到 Deferred。
- [ ] **`bun run eval` against 30+30 labeled samples**. Haiku filter precision/recall。`docs/eval/relevance-filter-samples.md` 已有 9 个种子。Founder activity（要 founder 亲手打标，AI 不能伪造 ground truth）。
- [ ] **Resend webhook → email_events 表**. 国内邮箱（QQ / 163 / 阿里云邮 / Gmail-CN）送达率监控。Magic link 可能根本到不了。30 min once Resend dashboard 配好。
- [ ] **Converted feedback textarea + playbooks 表预留**. 替代社区版块（codex 同意社区否决）。用户标 `converted` 时弹一个可空 textarea "这条破冰为什么有效？"。攒 50 条后 `/playbooks` 精选页（不可发帖、不可评论）。

### P1 — explore alongside P0 (30-60 天)

- [ ] **微信手动收款 + 修正后的 ¥0 paid + 5 retention 目标**（不是 ¥495）. 30 天目标改成"5 个真实 retention 用户（送码）"。付费推到 day 60-90，先证明 retention。¥99 × 5 = ¥495 在 0 audience + 大厂在职不能公开的情况下数学上接近 0 概率（codex 算出来）。
- [ ] **同时探索"代运营 / 培训 / 服务"非订阅变现路径**. 联系 5 个中文 indie 问 "愿意付 ¥2-5k/月让我帮你做 outreach 吗"。订阅模型在中文 indie 圈白嫖文化下 LTV 可能只 ¥40-80，订阅 ceiling 远低于服务模式。Codex 提出，CEO review 原版漏了。
- [ ] **即刻品牌账号 + auto-share weekly poster**. 仅在 P-1a 全职决策完成后执行（否则 reputational 风险高）。注册 @first100 即刻账号 → 周一 cron 跑完 weekly poster → OAuth auto-post 到 founder 即刻 → 转发到品牌账号。

### P1 — block first non-founder user

- [ ] **Playwright E2E for the core flow.** Login → create product → scan → see outreach → mark sent → see streak. CEO plan estimated 1.5 CC-day. Unit tests now exist (`bun test`, 59 cases on pure functions) + `bun run smoke` (AI pipeline) — but dashboard interactions, auth/RLS edges, and Server Action edges are still uncovered by browser-level E2E.
- [ ] **Resend webhook → `email_events` table.** /admin panel 5 is a placeholder. Wire up the webhook so the founder can see delivery / bounce / complaint rates per send. 30 min once the Resend dashboard is set up.
- [ ] **`bun run eval` against 30+30 labeled samples.** docs/eval/relevance-filter-samples.md has 8 V2EX seeds, 1 即刻 stub. Founder activity. Once labeled, the Haiku filter precision/recall is provable instead of vibes.

### P2 — quality-of-life

- [ ] **Reintroduce daily scan limit + idempotency window** when first non-founder user signs up. CEO plan §cost & abuse bounds.
- [ ] **Dedupe outreach_events on (outreach_id, status).** Currently double-clicking "已发送" inserts 2 rows → weekly stats inflate. UI disables button on event reach, but races possible. Either DB unique constraint + ON CONFLICT, or pre-insert SELECT.

### P3 — nice to have

- [ ] **Mobile responsive audit.** Dashboard is desktop-first. Founder uses on laptop, so low urgency, but eventual mobile-first dogfood will need it.
- [ ] **Dark mode.** DESIGN.md §1 scoped this to v0.5.
- [ ] **`/admin` query #5 (Resend deliverability)** — see P1.
- [ ] **More gracefully handle Sonnet runaway > OUTREACH_HARD_CAP.** Currently marked ai_failed. Could try a "trim and re-critique" pass.
- [ ] **Flesh out /pricing and /blog.** Both are one-sentence pages — visitor bounce risk. /pricing needs 3-feature comparison + CTA. /blog needs at least one real post (or hide the link until ready). Found by /qa on prod 2026-05-12 as ISSUE-003.

## Deferred

- [ ] **Reddit + Twitter scanners** — v0.5 English market expansion. CEO plan.
- [ ] **Outreach feature vector — post-body embedding dimension** — the 17 cheap dims ship at mark-time already; the `embedding` slot in `lib/feature-extractor.ts` is reserved/null. Wire a Voyage/Cohere call when a key is configured. Needed before the LightGBM ranking model can use semantic similarity.
- [ ] **ML ranking model (LightGBM baseline)** — when `outreach_events` ≥ 1000 rows. CEO plan.
- [ ] **Community playbook UI** — when `outreach_events` ≥ 5000 rows. CEO plan.
- [ ] **Paddle MoR payment integration** — v0.5 sprint. Indie-friendly $19/month, MOR handles ¥/$ + 支付宝.
- [ ] **Pricing waitlist A/B** — 3 landing pages × 1 week each, ¥39/¥68/¥99. CEO plan E8.
- [ ] **WeChat OAuth login** — v0.5.

## Completed (auto-archived by /retro)

(Most recent at top. Trim manually when this section grows past 30 items.)

- 2026-05-22~25: **/loop autonomous hardening (ticks 1-15)** — shipped without founder in-loop:
  - **Data moat**: outreach feature vector 17-dim capture at mark-time (`lib/feature-extractor.ts`, tick 2); caught + fixed a real `has_ps` CJK-regex bug via tests (tick 11) — Chinese 顺带/对了 mentions were silently recorded false.
  - **Security (/cso)**: CSRF Origin guard on /api/scan + /api/poster/generate (`lib/api-guards.ts`); DB-counted rate limit on /api/scan (10/hr); in-memory rate limit on /api/poster (20/hr); prompt-injection `<<USER_INPUT>>` boundaries in all 3 Claude prompts; baseline security headers (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) via next.config.
  - **Tests**: first test suite — `bun test`, 59 cases across 5 files (feature-extractor, the 3 LLM-output parsers/trust-boundary, shanghaiWeekBounds core-metric math, github-trending 1.6e+296 regression, ageDays).
  - **UX**: login resend-in-place (no email retype); scan chips show Chinese labels not raw slugs; product-form live char counters + honest labels (no fake 200-char min).
- 2026-05-13: **Magic link → 6-digit OTP** primary + magic link fallback (国内邮箱 prefetch 问题). Supabase email template uses `{{ .Token }}`.
- 2026-05-12: **/qa pass on prod** — ISSUE-001 hero subhead reflects all 6 platforms (`1c3a178`), ISSUE-002 kill English HTML5 email popup with noValidate (`0c51d0b`). ISSUE-003 sparse /pricing+/blog → see active P3. Health 88 → 93.
- 2026-05-12: **Ship to prod** — Vercel HKG/SIN edge at https://yourfirst100.co (custom Cloudflare-registered apex + www, SSL auto-provisioned). Painful path: bun-install hang in IAD → switched to npm; npm picked up local Alibaba intranet registry from `~/.npmrc` → committed project-level `.npmrc` pinning npmjs.org; SITE_URL env initially missing → og:image leaked localhost; first-deploy auto-alias was the throwaway `first-100-navy.vercel.app` instead of customer domain.
- 2026-05-12: Constant-time CRON_SECRET compare (timingSafeEqual)
- 2026-05-12: Edge → Node runtime + `preferredRegion = ['hkg1']` on /api/scan and /api/poster/generate (Edge didn't surface env reliably; HKG region pin via vercel.json instead)
- 2026-05-11: `regenerateOutreach` server action + UI button — per-prospect retry
- 2026-05-11: `/admin` observability page (5 panels, founder-only via FOUNDER_EMAILS)
- 2026-05-11: `bun run eval` runner against labeled samples
- 2026-05-11: DB perf indexes (0005 migration: outreach_events partial, scans composite, prospects covering)
- 2026-05-11: Prospect filter bar (?min_score, ?status with funnel counts)
- 2026-05-11: LLM output trust boundary (min/max chars on draft)
- 2026-05-11: Health pass — patch deps, simplified lint to tsc alias
- 2026-05-10: Lane A complete (Sonnet outreach + Haiku critique + jike paste + poster + streak)
- 2026-05-10: Lane A foundation (Next.js + Supabase + V2EX + Haiku filter + dashboard)
