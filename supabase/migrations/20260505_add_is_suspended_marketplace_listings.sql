-- Migration to add the is_suspended column to marketplace_listings
ALTER TABLE public.marketplace_listings
ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
