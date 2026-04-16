-- 20260415_chat_session_singleton.sql
--
-- D3: enforce one active chat session per (user_id, destination_id). Without this
-- guard, two browser tabs racing the "get or create" logic in /api/chat could each
-- insert a fresh active row, fragmenting history across sessions.
--
-- This migration is safe to re-run: the index is dropped first if present.
-- Run manually in Supabase SQL Editor (project convention; we do not auto-apply).

DROP INDEX IF EXISTS chat_sessions_one_active_per_user_dest;

CREATE UNIQUE INDEX chat_sessions_one_active_per_user_dest
  ON chat_sessions(user_id, destination_id)
  WHERE status = 'active';
