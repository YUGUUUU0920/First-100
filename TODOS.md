# TODOS

Long-running backlog. Items above the line are work that should ship soon. Items below are deferred for documented reasons — re-evaluate when the trigger condition is met.

## Active

### P1 — block first non-founder user

- [ ] **Playwright E2E for the core flow.** Login → create product → scan → see outreach → mark sent → see streak. CEO plan estimated 1.5 CC-day. Currently 0 test files; relying on `bun run smoke` (AI pipeline only) leaves dashboard interactions, RLS edges, Server Action edges uncovered.
- [ ] **Resend webhook → `email_events` table.** /admin panel 5 is a placeholder. Wire up the webhook so the founder can see delivery / bounce / complaint rates per send. 30 min once the Resend dashboard is set up.
- [ ] **`bun run eval` against 30+30 labeled samples.** docs/eval/relevance-filter-samples.md has 8 V2EX seeds, 1 即刻 stub. Founder activity. Once labeled, the Haiku filter precision/recall is provable instead of vibes.

### P2 — quality-of-life

- [ ] **Reintroduce daily scan limit + idempotency window** when first non-founder user signs up. CEO plan §cost & abuse bounds.
- [ ] **Constant-time CRON_SECRET compare** in /api/cron/weekly-poster. Negligible attack surface (32-byte hex), but easy to fix.
- [ ] **Dedupe outreach_events on (outreach_id, status).** Currently double-clicking "已发送" inserts 2 rows → weekly stats inflate. UI disables button on event reach, but races possible. Either DB unique constraint + ON CONFLICT, or pre-insert SELECT.
- [ ] **Edge runtime + `preferredRegion = ['hkg1']`** on /api/scan and /api/poster/generate before Vercel deploy. Turned off in dev because Next.js doesn't surface non-`NEXT_PUBLIC_` env to Edge in dev mode.

### P3 — nice to have

- [ ] **Mobile responsive audit.** Dashboard is desktop-first. Founder uses on laptop, so low urgency, but eventual mobile-first dogfood will need it.
- [ ] **Dark mode.** DESIGN.md §1 scoped this to v0.5.
- [ ] **`/admin` query #5 (Resend deliverability)** — see P1.
- [ ] **More gracefully handle Sonnet runaway > OUTREACH_HARD_CAP.** Currently marked ai_failed. Could try a "trim and re-critique" pass.
- [ ] **Per-prospect feature vector capture.** outreach_events.features is currently `{ source: "dashboard_button" }`. CEO plan §data flywheel wants full feature vector at mark-time so the v2 ranking model has training data.

## Deferred

- [ ] **Reddit + Twitter scanners** — v0.5 English market expansion. CEO plan.
- [ ] **ML ranking model (LightGBM baseline)** — when `outreach_events` ≥ 1000 rows. CEO plan.
- [ ] **Community playbook UI** — when `outreach_events` ≥ 5000 rows. CEO plan.
- [ ] **Paddle MoR payment integration** — v0.5 sprint. Indie-friendly $19/month, MOR handles ¥/$ + 支付宝.
- [ ] **Pricing waitlist A/B** — 3 landing pages × 1 week each, ¥39/¥68/¥99. CEO plan E8.
- [ ] **WeChat OAuth login** — v0.5.

## Completed (auto-archived by /retro)

(Most recent at top. Trim manually when this section grows past 30 items.)

- 2026-05-11: `regenerateOutreach` server action + UI button — per-prospect retry
- 2026-05-11: `/admin` observability page (5 panels, founder-only via FOUNDER_EMAILS)
- 2026-05-11: `bun run eval` runner against labeled samples
- 2026-05-11: DB perf indexes (0005 migration: outreach_events partial, scans composite, prospects covering)
- 2026-05-11: Prospect filter bar (?min_score, ?status with funnel counts)
- 2026-05-11: LLM output trust boundary (min/max chars on draft)
- 2026-05-11: Health pass — patch deps, simplified lint to tsc alias
- 2026-05-10: Lane A complete (Sonnet outreach + Haiku critique + jike paste + poster + streak)
- 2026-05-10: Lane A foundation (Next.js + Supabase + V2EX + Haiku filter + dashboard)
