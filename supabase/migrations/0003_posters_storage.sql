-- =============================================================================
-- 0003_posters_storage.sql
-- Create the `posters` Storage bucket. Posters are private; access is via
-- signed URLs minted server-side using the service role key.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', false, 5242880, ARRAY['image/png'])
on conflict (id) do nothing;
