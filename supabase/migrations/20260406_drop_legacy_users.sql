-- ============================================================
-- MyHoliday — Drop Legacy Users Table
-- The old public.users table (with password_hash) is superseded
-- by Supabase auth.users + traveller_profiles + tour_guides.
-- It has been empty since the auth migration (20260320).
-- RLS was already locked (no policies = deny-all).
-- ============================================================
-- VERIFY before running: SELECT COUNT(*) FROM public.users;
-- Expected result: 0
-- ============================================================

DROP TABLE IF EXISTS public.users CASCADE;
