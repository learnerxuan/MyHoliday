-- Allow admins to update marketplace listings (e.g. suspending/reopening)
-- CORRECTED to use auth.jwt()

DO $$
BEGIN
  -- Drop existing policy if present just in case
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: update marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: update marketplace listings" ON public.marketplace_listings;
  END IF;

  -- Create the policy using auth.jwt() which correctly reads the user_metadata role
  CREATE POLICY "admin: update marketplace listings" ON public.marketplace_listings
    FOR UPDATE
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
END
$$;
