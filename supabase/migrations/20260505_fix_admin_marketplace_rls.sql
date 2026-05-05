-- Fix Admin RLS Policy for marketplace_listings
-- Drops any existing admin update policies and creates a comprehensive one

DO $$
BEGIN
  -- Drop existing policies if present
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: update marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: update marketplace listings" ON public.marketplace_listings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: all marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: all marketplace listings" ON public.marketplace_listings;
  END IF;

  -- Create a comprehensive policy allowing admins to perform ANY action on marketplace listings
  CREATE POLICY "admin: all marketplace listings" ON public.marketplace_listings
    FOR ALL
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
END
$$;
