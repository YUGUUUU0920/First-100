-- =============================================================================
-- 0004_pg_cron_weekly_poster.sql
-- Schedules the weekly poster cron in pg_cron.  Fires Monday 09:00
-- Asia/Shanghai (= 01:00 UTC) and POSTs to the deployed app's
-- /api/cron/weekly-poster route.
--
-- Prerequisites:
--   1. `pg_cron` and `pg_net` extensions must be enabled in the Supabase
--      project (Settings → Database → Extensions). Free tier supports both.
--   2. Two `vault.secrets` (or env vars) must exist:
--        - `cron_target_url`  → e.g.  https://yourfirst100.vercel.app/api/cron/weekly-poster
--        - `cron_secret`      → matches the CRON_SECRET env var on the deploy
--      Vault path used below: vault.secrets.<name>
--
-- After deploy, set those vault values:
--   select vault.create_secret('https://yourfirst100.vercel.app/api/cron/weekly-poster', 'cron_target_url');
--   select vault.create_secret('<random-32-byte-hex>', 'cron_secret');
--
-- Then run this migration. Re-running is idempotent (cron.unschedule before
-- cron.schedule).
-- =============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Drop the job if it already exists (idempotent re-run)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'weekly-poster') then
    perform cron.unschedule('weekly-poster');
  end if;
end$$;

-- 1:00 UTC Monday = 9:00 Asia/Shanghai Monday
select cron.schedule(
  'weekly-poster',
  '0 1 * * 1',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_target_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
