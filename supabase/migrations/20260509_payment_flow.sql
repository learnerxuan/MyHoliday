-- ============================================================
-- Payment Flow Migration
-- Adds payment_enabled to marketplace_offers
-- Adds RLS policies for transactions table
-- ============================================================

-- 1. Add payment_enabled flag to marketplace_offers
ALTER TABLE public.marketplace_offers
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. RLS Policies for transactions table
-- (table already exists from full_schema.sql)
-- Drop first to avoid duplicates, then recreate

DROP POLICY IF EXISTS "traveller: read own transactions" ON public.transactions;
CREATE POLICY "traveller: read own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = payer_id);

DROP POLICY IF EXISTS "guide: read own transactions" ON public.transactions;
CREATE POLICY "guide: read own transactions"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tour_guides
      WHERE id = transactions.payee_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "authenticated: insert transactions" ON public.transactions;
CREATE POLICY "authenticated: insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "traveller: update own transaction" ON public.transactions;
CREATE POLICY "traveller: update own transaction"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = payer_id)
  WITH CHECK (auth.uid() = payer_id);
