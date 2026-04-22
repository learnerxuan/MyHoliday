-- ============================================================
-- MyHoliday — Consolidated Database Schema
-- Travel and Tourism Recommendation System
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
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
    listing_id  UUID          NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
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
CREATE INDEX idx_messages_listing         ON public.marketplace_messages(listing_id);

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

-- ── POLICIES ────────────────────────────────────────────────

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
