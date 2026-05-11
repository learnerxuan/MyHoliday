-- ============================================================
-- MyHoliday consolidated Supabase migration
-- Squashed from all migrations present on 2026-05-10
-- ============================================================

-- ============================================================
-- Source: 20260420000000_full_schema.sql
-- ============================================================

-- ============================================================
-- MyHoliday - Consolidated Database Schema
-- Travel and Tourism Recommendation System
-- ============================================================

-- EXTENSIONS ------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DESTINATIONS
-- ============================================================
CREATE TABLE public.destinations (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    city                VARCHAR(100)  NOT NULL,
    country             VARCHAR(100)  NOT NULL,
    region              VARCHAR(100),
    short_description   TEXT,
    latitude            FLOAT,
    longitude           FLOAT,
    avg_temp_monthly    JSONB,
    ideal_durations     JSONB,
    budget_level        VARCHAR(20)   CHECK (budget_level IN ('Budget', 'Mid-range', 'Luxury')),
    culture             SMALLINT      CHECK (culture    BETWEEN 0 AND 5),
    adventure           SMALLINT      CHECK (adventure  BETWEEN 0 AND 5),
    nature              SMALLINT      CHECK (nature     BETWEEN 0 AND 5),
    beaches             SMALLINT      CHECK (beaches    BETWEEN 0 AND 5),
    nightlife           SMALLINT      CHECK (nightlife  BETWEEN 0 AND 5),
    cuisine             SMALLINT      CHECK (cuisine    BETWEEN 0 AND 5),
    wellness            SMALLINT      CHECK (wellness   BETWEEN 0 AND 5),
    urban               SMALLINT      CHECK (urban      BETWEEN 0 AND 5),
    seclusion           SMALLINT      CHECK (seclusion  BETWEEN 0 AND 5),
    categories          TEXT,
    best_time_to_visit  TEXT
);

-- ============================================================
-- 2. TRAVELLER PROFILES (Linked to auth.users)
-- ============================================================
CREATE TABLE public.traveller_profiles (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               VARCHAR(150),
    date_of_birth           DATE,
    nationality             VARCHAR(100),
    dietary_restrictions    VARCHAR(100),
    accessibility_needs     BOOLEAN       DEFAULT FALSE,
    preferred_language      VARCHAR(50)   DEFAULT 'English',
    created_at              TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 3. TOUR_GUIDES (Linked to auth.users)
-- ============================================================
CREATE TABLE public.tour_guides (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               VARCHAR(150),
    city_id                 UUID          REFERENCES public.destinations(id) ON DELETE SET NULL,
    document_url            VARCHAR(500),
    verification_status     VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at              TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 4. CHAT_SESSIONS
-- ============================================================
CREATE TABLE public.chat_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID        NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    planner_state   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP   DEFAULT NOW()
);

-- ============================================================
-- 5. CHAT_MESSAGES
-- ============================================================
CREATE TABLE public.chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMP   DEFAULT NOW()
);

-- ============================================================
-- 6. ITINERARIES
-- ============================================================
CREATE TABLE public.itineraries (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID         NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    session_id      UUID         REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    content         JSONB        NOT NULL,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);

-- ============================================================
-- 7. MARKETPLACE_LISTINGS
-- ============================================================
CREATE TABLE public.marketplace_listings (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    itinerary_id    UUID          NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    destination_id  UUID          NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    desired_budget  NUMERIC(10,2),
    status          VARCHAR(20)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'negotiating', 'confirmed', 'closed')),
    created_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 8. MARKETPLACE_OFFERS
-- ============================================================
CREATE TABLE public.marketplace_offers (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID          NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    guide_id        UUID          NOT NULL REFERENCES public.tour_guides(id) ON DELETE CASCADE,
    proposed_price  NUMERIC(10,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 9. MARKETPLACE_MESSAGES
-- ============================================================
CREATE TABLE public.marketplace_messages (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id    UUID          NOT NULL REFERENCES public.marketplace_offers(id) ON DELETE CASCADE,
    sender_type VARCHAR(20)   NOT NULL CHECK (sender_type IN ('traveler', 'guide')),
    sender_id   UUID          NOT NULL,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 10. TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id            UUID          NOT NULL REFERENCES marketplace_offers(id) ON DELETE RESTRICT,
    payer_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    payee_id            UUID          NOT NULL REFERENCES public.tour_guides(id) ON DELETE RESTRICT,
    total_amount        NUMERIC(10,2) NOT NULL,
    service_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
    guide_payout        NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
    payment_reference   VARCHAR(100)  UNIQUE,
    created_at          TIMESTAMP     DEFAULT NOW(),
    CONSTRAINT payout_check CHECK (guide_payout = total_amount - service_charge)
);

-- ============================================================
-- 11. HISTORICAL_TRIPS (ML Dataset)
-- ============================================================
CREATE TABLE public.historical_trips (
    id                      SERIAL        PRIMARY KEY,
    destination             VARCHAR(150),
    duration_days           FLOAT,
    traveler_age            FLOAT,
    traveler_gender         VARCHAR(20),
    traveler_nationality    VARCHAR(100),
    accommodation_type      VARCHAR(50),
    accommodation_cost      NUMERIC(10,2),
    transportation_type     VARCHAR(50),
    transportation_cost     NUMERIC(10,2)
);

-- ============================================================
-- 12. USER_INTERACTIONS
-- ============================================================
CREATE TABLE public.user_interactions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID        REFERENCES public.destinations(id) ON DELETE CASCADE,
    type            TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_destinations_city        ON public.destinations(city);
CREATE INDEX idx_traveller_profiles_user  ON public.traveller_profiles(user_id);
CREATE INDEX idx_tour_guides_user         ON public.tour_guides(user_id);
CREATE INDEX idx_tour_guides_city         ON public.tour_guides(city_id);
CREATE INDEX idx_chat_sessions_user       ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_dest       ON public.chat_sessions(destination_id);
CREATE INDEX idx_chat_messages_session    ON public.chat_messages(session_id);
CREATE INDEX idx_itineraries_user         ON public.itineraries(user_id);
CREATE INDEX idx_itineraries_dest         ON public.itineraries(destination_id);
CREATE INDEX idx_listings_user            ON public.marketplace_listings(user_id);
CREATE INDEX idx_listings_dest            ON public.marketplace_listings(destination_id);
CREATE INDEX idx_offers_listing           ON public.marketplace_offers(listing_id);
CREATE INDEX idx_offers_guide             ON public.marketplace_offers(guide_id);
CREATE INDEX idx_messages_offer           ON public.marketplace_messages(offer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.destinations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveller_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_guides        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions   ENABLE ROW LEVEL SECURITY;

-- POLICIES --------------------------------------------------

-- Destinations: Public Read
CREATE POLICY "public: read all destinations" ON public.destinations FOR SELECT USING (true);

-- Traveller Profiles: Own Access + Admin Read
CREATE POLICY "traveller: own row" ON public.traveller_profiles 
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin: read all profiles" ON public.traveller_profiles FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Tour Guides: Own Access + Admin Full
CREATE POLICY "guide: own row" ON public.tour_guides 
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin: manage guides" ON public.tour_guides USING 
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Chat & Itineraries: Own Access
CREATE POLICY "user: own chat sessions" ON public.chat_sessions USING (auth.uid() = user_id);
CREATE POLICY "user: own chat messages" ON public.chat_messages USING 
    (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid()));
CREATE POLICY "user: own itineraries" ON public.itineraries USING (auth.uid() = user_id);

-- User Interactions: Own Access
CREATE POLICY "user: own interactions" ON public.user_interactions USING (auth.uid() = user_id);


-- ============================================================
-- Source: 20260420_add_is_active_traveller_profiles.sql
-- ============================================================

-- Add is_active column to traveller_profiles for soft-delete (default TRUE)
-- Run this in Supabase SQL Editor or apply via your migration workflow

ALTER TABLE public.traveller_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT TRUE;

-- Ensure existing rows are active
UPDATE public.traveller_profiles SET is_active = TRUE WHERE is_active IS NULL;

-- Create an index to speed up queries filtering by is_active
CREATE INDEX IF NOT EXISTS idx_traveller_profiles_is_active ON public.traveller_profiles(is_active);


-- ============================================================
-- Source: 20260421_add_admin_update_policy_traveller_profiles.sql
-- ============================================================

-- Grant admin users the ability to UPDATE traveller_profiles (e.g. set is_active)
-- Run this migration using your Supabase migration workflow or SQL editor.

-- Allow admins (role = 'admin' stored in auth.users.raw_user_meta_data) to UPDATE traveller_profiles
CREATE POLICY "admin: update profiles" ON public.traveller_profiles
  FOR UPDATE
  USING ((SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Optionally, you may want to add a corresponding DELETE policy in a future migration.


-- ============================================================
-- Source: 20260421_fix_admin_update_policy_use_jwt_claims.sql
-- ============================================================

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


-- ============================================================
-- Source: 20260430_add_admin_update_policy_marketplace_listings.sql
-- ============================================================

-- Allow admins to update marketplace listings (e.g. suspending/reopening)
-- CORRECTED to use auth.jwt()

DO $$
BEGIN
  -- Drop existing policy if present just in case
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: update marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: update marketplace listings" ON public.marketplace_listings;
  END IF;

  -- Create the policy using auth.jwt() which correctly reads the user_metadata role
  CREATE POLICY "admin: update marketplace listings" ON public.marketplace_listings
    FOR UPDATE
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
END
$$;


-- ============================================================
-- Source: 20260505_add_is_suspended_marketplace_listings.sql
-- ============================================================

-- Migration to add the is_suspended column to marketplace_listings
ALTER TABLE public.marketplace_listings
ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- Source: 20260505_fix_admin_marketplace_rls.sql
-- ============================================================

-- Fix Admin RLS Policy for marketplace_listings
-- Drops any existing admin update policies and creates a comprehensive one

DO $$
BEGIN
  -- Drop existing policies if present
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: update marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: update marketplace listings" ON public.marketplace_listings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'admin: all marketplace listings'
      AND polrelid = 'public.marketplace_listings'::regclass
  ) THEN
    DROP POLICY IF EXISTS "admin: all marketplace listings" ON public.marketplace_listings;
  END IF;

  -- Create a comprehensive policy allowing admins to perform ANY action on marketplace listings
  CREATE POLICY "admin: all marketplace listings" ON public.marketplace_listings
    FOR ALL
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
END
$$;


-- ============================================================
-- Source: 20260505_rpc_suspend_listing.sql
-- ============================================================

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


-- ============================================================
-- Source: 20260508_add_edited_itinerary_marketplace_offers.sql
-- ============================================================

-- Add edited_itinerary column to marketplace_offers
-- This allows a tour guide to provide a customized/suggested itinerary
-- per offer, without modifying the traveller's original itinerary.

ALTER TABLE public.marketplace_offers
  ADD COLUMN IF NOT EXISTS edited_itinerary JSONB DEFAULT NULL;

COMMENT ON COLUMN public.marketplace_offers.edited_itinerary IS 
  'Optional: tour guide suggested edits to the traveller itinerary, scoped to this offer only. The original itinerary in the itineraries table is NOT modified.';


-- ============================================================
-- Source: 20260508_enable_realtime_marketplace_messages.sql
-- ============================================================

-- Enable Realtime for marketplace_messages to support live chat
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;


-- ============================================================
-- Source: 20260508_fix_marketplace_messages_rls.sql
-- ============================================================

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


-- ============================================================
-- Source: 20260509_fix_marketplace_message_insert_policy.sql
-- ============================================================

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


-- ============================================================
-- Source: 20260509_payment_flow.sql
-- ============================================================

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


-- ============================================================
-- Source: 20260510_hide_deleted_marketplace_access.sql
-- ============================================================

-- Hide traveller-deleted marketplace listings from guides and disable their chats.
-- Listings are soft-deleted by setting status = 'closed' so related offers,
-- messages, and transaction history can remain intact without granting access.

DROP POLICY IF EXISTS "participants: read messages" ON public.marketplace_messages;

CREATE POLICY "participants: read messages"
ON public.marketplace_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_offers mo
    JOIN public.marketplace_listings ml ON ml.id = mo.listing_id
    WHERE mo.id = marketplace_messages.offer_id
      AND ml.status <> 'closed'
      AND COALESCE(ml.is_suspended, false) = false
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
      AND ml.status <> 'closed'
      AND COALESCE(ml.is_suspended, false) = false
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


-- ============================================================
-- Source: 20260511000000_normalize_survey_nationalities.sql
-- ============================================================

-- Normalise adjective/variant nationality values in historical_trips
-- to consistent country-name strings used by the recommendation engine.
UPDATE public.historical_trips
SET traveler_nationality = CASE traveler_nationality
  WHEN 'American'      THEN 'United States'
  WHEN 'USA'           THEN 'United States'
  WHEN 'Australian'    THEN 'Australia'
  WHEN 'Brazilian'     THEN 'Brazil'
  WHEN 'British'       THEN 'United Kingdom'
  WHEN 'UK'            THEN 'United Kingdom'
  WHEN 'Cambodia'      THEN 'Cambodia'
  WHEN 'Canadian'      THEN 'Canada'
  WHEN 'Chinese'       THEN 'China'
  WHEN 'Dutch'         THEN 'Netherlands'
  WHEN 'Emirati'       THEN 'United Arab Emirates'
  WHEN 'French'        THEN 'France'
  WHEN 'German'        THEN 'Germany'
  WHEN 'Greece'        THEN 'Greece'
  WHEN 'Hong Kong'     THEN 'Hong Kong'
  WHEN 'Indian'        THEN 'India'
  WHEN 'Indonesian'    THEN 'Indonesia'
  WHEN 'Italian'       THEN 'Italy'
  WHEN 'Japanese'      THEN 'Japan'
  WHEN 'Korean'        THEN 'South Korea'
  WHEN 'Mexican'       THEN 'Mexico'
  WHEN 'Moroccan'      THEN 'Morocco'
  WHEN 'New Zealander' THEN 'New Zealand'
  WHEN 'Scottish'      THEN 'United Kingdom'
  WHEN 'South African' THEN 'South Africa'
  WHEN 'South Korean'  THEN 'South Korea'
  WHEN 'Spanish'       THEN 'Spain'
  WHEN 'Taiwanese'     THEN 'Taiwan'
  WHEN 'Vietnamese'    THEN 'Vietnam'
  ELSE traveler_nationality
END
WHERE traveler_nationality IS NOT NULL;

-- Normalise nationality values in traveller_profiles.
UPDATE public.traveller_profiles
SET nationality = CASE nationality
  WHEN 'Malaysian' THEN 'Malaysia'
  WHEN 'Japanese'  THEN 'Japan'
  WHEN 'American'  THEN 'United States'
  WHEN 'Korean'    THEN 'South Korea'
  ELSE nationality
END
WHERE nationality IS NOT NULL;

-- Normalise transportation_type values in historical_trips.
UPDATE public.historical_trips
SET transportation_type = CASE transportation_type
  WHEN 'Plane'    THEN 'Flight'
  WHEN 'Airplane' THEN 'Flight'
  ELSE transportation_type
END
WHERE transportation_type IS NOT NULL;


-- ============================================================
-- Source: 20260511000000_admin_analytics_read_policies.sql
-- ============================================================

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
