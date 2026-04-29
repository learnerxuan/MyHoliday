-- Make admin FOR UPDATE policy robust by checking JWT claims as well as auth.users
-- This avoids permission errors when the policy's subquery cannot read auth.users

DO $$
BEGIN
  -- Drop existing policy if present
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: update profiles'
      AND polrelid = 'public.traveller_profiles'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: update profiles" ON public.traveller_profiles;
  END IF;

  -- Create a policy that allows admin updates by checking either auth.users
  -- (legacy) OR the JWT claims (safer in many Supabase setups).
  CREATE POLICY "admin: update profiles" ON public.traveller_profiles
    FOR UPDATE
    USING (
      (SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin'
      OR (current_setting('jwt.claims', true)::json ->> 'role') = 'admin'
    );
END
$$;
