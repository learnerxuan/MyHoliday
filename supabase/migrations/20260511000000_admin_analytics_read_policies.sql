-- Allow admin users to read analytics tables used by /admin and /admin/reports.
-- Admin role is stored in auth.users.raw_user_meta_data.role.

CREATE POLICY "admin: read chat sessions"
  ON public.chat_sessions
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read chat messages"
  ON public.chat_messages
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read itineraries"
  ON public.itineraries
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read marketplace offers"
  ON public.marketplace_offers
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read marketplace messages"
  ON public.marketplace_messages
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read transactions"
  ON public.transactions
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin: read user interactions"
  ON public.user_interactions
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

ALTER TABLE public.historical_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin: read historical trips"
  ON public.historical_trips
  FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "survey: insert historical trips"
  ON public.historical_trips
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "marketplace: read traveller profile summaries"
  ON public.traveller_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.marketplace_listings ml
      WHERE ml.user_id = traveller_profiles.user_id
        AND (
          ml.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.tour_guides tg
            WHERE tg.user_id = auth.uid()
          )
        )
    )
  );
