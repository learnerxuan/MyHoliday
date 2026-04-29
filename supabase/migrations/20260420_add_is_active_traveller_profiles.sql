-- Add is_active column to traveller_profiles for soft-delete (default TRUE)
-- Run this in Supabase SQL Editor or apply via your migration workflow

ALTER TABLE public.traveller_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT TRUE;

-- Ensure existing rows are active
UPDATE public.traveller_profiles SET is_active = TRUE WHERE is_active IS NULL;

-- Create an index to speed up queries filtering by is_active
CREATE INDEX IF NOT EXISTS idx_traveller_profiles_is_active ON public.traveller_profiles(is_active);
