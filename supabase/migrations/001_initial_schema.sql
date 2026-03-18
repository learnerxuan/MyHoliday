-- ============================================================
-- MyHoliday — Database Schema
-- Travel and Tourism Recommendation System
-- AAPP011-4-2 Capstone Project
-- ============================================================
-- Run this entire file in Supabase SQL Editor
-- Tables are ordered to respect foreign key dependencies
-- ============================================================


-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. DESTINATIONS
-- Must be created before users, tour_guides, chat_sessions,
-- itineraries, marketplace_listings
-- ============================================================
CREATE TABLE destinations (
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
-- 2. HISTORICAL_TRIPS
-- Standalone dataset table, no foreign keys
-- ============================================================
CREATE TABLE historical_trips (
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
-- 3. USERS
-- ============================================================
CREATE TABLE users (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255)  NOT NULL UNIQUE,
    password_hash           VARCHAR(255)  NOT NULL,
    full_name               VARCHAR(150)  NOT NULL,
    phone                   VARCHAR(20),
    date_of_birth           DATE,
    nationality             VARCHAR(100),
    dietary_restrictions    VARCHAR(100),
    accessibility_needs     BOOLEAN       DEFAULT FALSE,
    language_preferences    VARCHAR(50)   DEFAULT 'English',
    role                    VARCHAR(20)   NOT NULL DEFAULT 'traveler' CHECK (role IN ('traveler', 'admin')),
    created_at              TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 4. TOUR_GUIDES
-- Depends on: destinations
-- ============================================================
CREATE TABLE tour_guides (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255)  NOT NULL UNIQUE,
    password_hash           VARCHAR(255)  NOT NULL,
    full_name               VARCHAR(150)  NOT NULL,
    phone                   VARCHAR(20),
    city_id                 UUID          REFERENCES destinations(id) ON DELETE SET NULL,
    document_url            VARCHAR(500),
    verification_status     VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at              TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 5. CHAT_SESSIONS
-- Depends on: users, destinations
-- ============================================================
CREATE TABLE chat_sessions (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID          NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at      TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 6. CHAT_MESSAGES
-- Depends on: chat_sessions
-- ============================================================
CREATE TABLE chat_messages (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID          NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20)   NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 7. ITINERARIES
-- Depends on: users, destinations, chat_sessions
-- ============================================================
CREATE TABLE itineraries (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id  UUID          NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    session_id      UUID          REFERENCES chat_sessions(id) ON DELETE SET NULL,
    title           VARCHAR(255)  NOT NULL,
    content         JSONB         NOT NULL,
    created_at      TIMESTAMP     DEFAULT NOW(),
    updated_at      TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 8. MARKETPLACE_LISTINGS
-- Depends on: users, itineraries, destinations
-- ============================================================
CREATE TABLE marketplace_listings (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id    UUID          NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    destination_id  UUID          NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    desired_budget  NUMERIC(10,2),
    status          VARCHAR(20)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'negotiating', 'confirmed', 'closed')),
    created_at      TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 9. MARKETPLACE_OFFERS
-- Depends on: marketplace_listings, tour_guides
-- ============================================================
CREATE TABLE marketplace_offers (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID          NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    guide_id        UUID          NOT NULL REFERENCES tour_guides(id) ON DELETE CASCADE,
    proposed_price  NUMERIC(10,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at      TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 10. MARKETPLACE_MESSAGES
-- Depends on: marketplace_listings
-- Note: sender_id is NOT a FK — polymorphic association
--       sender_type indicates whether sender is 'traveler' or 'guide'
-- ============================================================
CREATE TABLE marketplace_messages (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID          NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    sender_type VARCHAR(20)   NOT NULL CHECK (sender_type IN ('traveler', 'guide')),
    sender_id   UUID          NOT NULL,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     DEFAULT NOW()
);


-- ============================================================
-- 11. TRANSACTIONS
-- Depends on: marketplace_offers, users, tour_guides
-- ============================================================
CREATE TABLE transactions (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id            UUID          NOT NULL REFERENCES marketplace_offers(id) ON DELETE RESTRICT,
    payer_id            UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payee_id            UUID          NOT NULL REFERENCES tour_guides(id) ON DELETE RESTRICT,
    total_amount        NUMERIC(10,2) NOT NULL,
    service_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
    guide_payout        NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
    payment_reference   VARCHAR(100)  UNIQUE,
    created_at          TIMESTAMP     DEFAULT NOW(),

    -- Ensure the maths always adds up
    CONSTRAINT payout_check CHECK (guide_payout = total_amount - service_charge)
);


-- ============================================================
-- INDEXES
-- For commonly queried foreign keys and filter columns
-- ============================================================
CREATE INDEX idx_tour_guides_city         ON tour_guides(city_id);
CREATE INDEX idx_chat_sessions_user       ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_dest       ON chat_sessions(destination_id);
CREATE INDEX idx_chat_messages_session    ON chat_messages(session_id);
CREATE INDEX idx_itineraries_user         ON itineraries(user_id);
CREATE INDEX idx_itineraries_dest         ON itineraries(destination_id);
CREATE INDEX idx_listings_user            ON marketplace_listings(user_id);
CREATE INDEX idx_listings_dest            ON marketplace_listings(destination_id);
CREATE INDEX idx_listings_status          ON marketplace_listings(status);
CREATE INDEX idx_offers_listing           ON marketplace_offers(listing_id);
CREATE INDEX idx_offers_guide             ON marketplace_offers(guide_id);
CREATE INDEX idx_messages_listing         ON marketplace_messages(listing_id);
CREATE INDEX idx_transactions_offer       ON transactions(offer_id);
CREATE INDEX idx_transactions_payer       ON transactions(payer_id);