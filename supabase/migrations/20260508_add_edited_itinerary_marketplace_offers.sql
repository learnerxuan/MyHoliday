-- Add edited_itinerary column to marketplace_offers
-- This allows a tour guide to provide a customized/suggested itinerary
-- per offer, without modifying the traveller's original itinerary.

ALTER TABLE public.marketplace_offers
  ADD COLUMN IF NOT EXISTS edited_itinerary JSONB DEFAULT NULL;

COMMENT ON COLUMN public.marketplace_offers.edited_itinerary IS 
  'Optional: tour guide suggested edits to the traveller itinerary, scoped to this offer only. The original itinerary in the itineraries table is NOT modified.';
