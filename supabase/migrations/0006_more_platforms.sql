-- =============================================================================
-- 0006_more_platforms.sql
-- Adds 2 platforms to the source enum:
--   - xhs-pasted: user pastes from 小红书 app, same flow as jike-pasted
--   - juejin:    scraper for juejin.cn 后端 / AI 标签, same flow as v2ex
--
-- ALTER TYPE ... ADD VALUE is idempotent enough — Postgres will error if the
-- value already exists. Guard with a DO block so the migration is safe to
-- re-run.
-- =============================================================================

-- Note: cannot wrap multiple ADD VALUE in one DO block (each must be its own
-- transaction). Run each ALTER on its own — Supabase SQL editor splits on
-- semicolons. Re-running is safe with `if not exists`.
alter type public.platform add value if not exists 'xhs-pasted';
alter type public.platform add value if not exists 'juejin';
alter type public.platform add value if not exists 'sspai';
alter type public.platform add value if not exists 'github-cn';
