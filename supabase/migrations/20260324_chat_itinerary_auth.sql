-- ============================================================
-- MyHoliday — Chat & Itinerary Tables Migration
-- Recreates chat_sessions, chat_messages, and itineraries
-- referencing auth.users(id) instead of the old custom users table
-- Run this in Supabase SQL Editor
-- ============================================================


-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- DROP old tables (in reverse dependency order)
-- Safe to run even if they don't exist yet
-- ============================================================
DROP TABLE IF EXISTS public.itineraries    CASCADE;
DROP TABLE IF EXISTS public.chat_messages  CASCADE;
DROP TABLE IF EXISTS public.chat_sessions  CASCADE;


-- ============================================================
-- 1. CHAT_SESSIONS
-- One session per planning visit (user + destination pair)
-- Multiple active sessions per city are allowed
-- ============================================================
CREATE TABLE public.chat_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID        NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'completed')),
    created_at      TIMESTAMP   DEFAULT NOW()
);


-- ============================================================
-- 2. CHAT_MESSAGES
-- Stores only 'user' and 'assistant' messages
-- Tool messages are handled server-side only and never stored
-- ============================================================
CREATE TABLE public.chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMP   DEFAULT NOW()
);


-- ============================================================
-- 3. ITINERARIES
-- Written on export — each export creates a new row
-- Partial itineraries allowed (not all days need to be confirmed)
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
-- INDEXES
-- ============================================================
CREATE INDEX idx_chat_sessions_user    ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_dest    ON public.chat_sessions(destination_id);
CREATE INDEX idx_chat_sessions_status  ON public.chat_sessions(status);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_itineraries_user      ON public.itineraries(user_id);
CREATE INDEX idx_itineraries_dest      ON public.itineraries(destination_id);
CREATE INDEX idx_itineraries_session   ON public.itineraries(session_id);


-- ============================================================
-- ROW LEVEL SECURITY — Enable
-- ============================================================
ALTER TABLE public.chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES — chat_sessions
-- ============================================================
CREATE POLICY "user: own chat sessions select"
    ON public.chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user: own chat sessions insert"
    ON public.chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user: own chat sessions update"
    ON public.chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "user: own chat sessions delete"
    ON public.chat_sessions FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES — chat_messages
-- Users can access messages belonging to their own sessions
-- ============================================================
CREATE POLICY "user: own chat messages select"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "user: own chat messages insert"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "user: own chat messages delete"
    ON public.chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );


-- ============================================================
-- RLS POLICIES — itineraries
-- ============================================================
CREATE POLICY "user: own itineraries select"
    ON public.itineraries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user: own itineraries insert"
    ON public.itineraries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user: own itineraries update"
    ON public.itineraries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "user: own itineraries delete"
    ON public.itineraries FOR DELETE
    USING (auth.uid() = user_id);
