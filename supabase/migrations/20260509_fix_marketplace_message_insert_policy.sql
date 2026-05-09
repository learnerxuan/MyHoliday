-- Allow marketplace chat participants to insert messages.
-- This is required for system notifications such as offer acceptance,
-- payment enabled, and payment completed to appear in realtime.

DROP POLICY IF EXISTS "participants: insert messages" ON public.marketplace_messages;

CREATE POLICY "participants: insert messages"
ON public.marketplace_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND sender_type IN ('traveler', 'guide')
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_offers mo
    JOIN public.marketplace_listings ml ON ml.id = mo.listing_id
    WHERE mo.id = marketplace_messages.offer_id
      AND (
        (sender_type = 'traveler' AND ml.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.tour_guides tg
          WHERE sender_type = 'guide'
            AND tg.id = mo.guide_id
            AND tg.user_id = auth.uid()
        )
      )
  )
);
