ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS planner_state JSONB NOT NULL DEFAULT '{}'::jsonb;
