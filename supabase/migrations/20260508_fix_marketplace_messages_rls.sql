-- ============================================================
-- Fix marketplace_messages RLS policies
-- 1. Remove the overly permissive public read policy
-- 2. Fix the broken "participants: read messages" policy
--    (it incorrectly joined on offer_id = listing_id)
-- ============================================================

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "Enable public read access for marketplace messages" ON public.marketplace_messages;

-- Drop the broken participant policy (wrong join condition)
DROP POLICY IF EXISTS "participants: read messages" ON public.marketplace_messages;

-- Create a correct participant SELECT policy
-- Only the traveller (listing owner) OR the guide involved in the offer can read messages
CREATE POLICY "participants: read messages"
ON public.marketplace_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_offers mo
    JOIN public.marketplace_listings ml ON ml.id = mo.listing_id
    WHERE mo.id = marketplace_messages.offer_id
      AND (
        ml.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.tour_guides tg
          WHERE tg.id = mo.guide_id
            AND tg.user_id = auth.uid()
        )
      )
  )
);
