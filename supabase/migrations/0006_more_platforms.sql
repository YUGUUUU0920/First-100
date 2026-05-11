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

do $$
begin
  if not exists (select 1 from pg_enum
                 where enumtypid = 'public.platform'::regtype
                   and enumlabel = 'xhs-pasted') then
    alter type public.platform add value 'xhs-pasted';
  end if;
  if not exists (select 1 from pg_enum
                 where enumtypid = 'public.platform'::regtype
                   and enumlabel = 'juejin') then
    alter type public.platform add value 'juejin';
  end if;
end$$;
