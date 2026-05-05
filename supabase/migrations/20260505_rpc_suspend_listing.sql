-- Create an RPC function to suspend listings that bypasses RLS
-- This function runs as SECURITY DEFINER, meaning it executes with superuser privileges,
-- ignoring Row Level Security. The API route is responsible for ensuring only admins can call it.

CREATE OR REPLACE FUNCTION admin_suspend_listing(p_listing_id UUID, p_is_suspended BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketplace_listings 
  SET is_suspended = p_is_suspended 
  WHERE id = p_listing_id;
  
  RETURN FOUND;
END;
$$;
