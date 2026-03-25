-- ============================================================
-- MyHoliday — RLS Security Fix
-- Enables Row Level Security on all remaining public tables
-- that were created in 001_initial_schema.sql without RLS.
--
-- Strategy:
--   • destinations       → public read (app needs anonymous access)
--   • historical_trips   → no policies (internal ML data, deny all client access)
--   • users (deprecated) → no policies (old table, not used; lock it down)
--   • marketplace_*      → no policies (feature not yet built; locked until policies are added)
--   • transactions       → no policies (locked until marketplace feature is built)
--
-- Enabling RLS with NO policies = deny-all by default.
-- Only the service_role key can bypass RLS.
-- ============================================================


-- ============================================================
-- 1. DESTINATIONS — enable RLS + public read
-- Anyone (including unauthenticated users) can browse destinations.
-- No writes from the client — only service_role (admin) can insert/update.
-- ============================================================
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public: read all destinations"
    ON public.destinations
    FOR SELECT
    USING (true);


-- ============================================================
-- 2. HISTORICAL_TRIPS — enable RLS, no client access
-- Internal dataset used for the recommendation engine.
-- Should only be accessed by server-side service_role calls.
-- ============================================================
ALTER TABLE public.historical_trips ENABLE ROW LEVEL SECURITY;
-- No policies intentionally — deny-all for all client keys.


-- ============================================================
-- 3. USERS (deprecated legacy table) — enable RLS, no client access
-- This table was replaced by Supabase auth.users + traveller_profiles.
-- Lock it down entirely; no new code should touch it.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- No policies intentionally — deny-all for all client keys.


-- ============================================================
-- 4. MARKETPLACE_LISTINGS — enable RLS
-- Policies will be added in the marketplace feature migration (Feature 08).
-- Until then, deny all client access.
-- ============================================================
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
-- No policies intentionally.


-- ============================================================
-- 5. MARKETPLACE_OFFERS — enable RLS
-- ============================================================
ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;
-- No policies intentionally.


-- ============================================================
-- 6. MARKETPLACE_MESSAGES — enable RLS
-- ============================================================
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;
-- No policies intentionally.


-- ============================================================
-- 7. TRANSACTIONS — enable RLS
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
-- No policies intentionally.
