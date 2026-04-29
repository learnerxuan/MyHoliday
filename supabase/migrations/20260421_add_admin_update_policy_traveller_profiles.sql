-- Grant admin users the ability to UPDATE traveller_profiles (e.g. set is_active)
-- Run this migration using your Supabase migration workflow or SQL editor.

-- Allow admins (role = 'admin' stored in auth.users.raw_user_meta_data) to UPDATE traveller_profiles
CREATE POLICY "admin: update profiles" ON public.traveller_profiles
  FOR UPDATE
  USING ((SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Optionally, you may want to add a corresponding DELETE policy in a future migration.
