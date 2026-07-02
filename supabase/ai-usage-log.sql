-- Migration : table de suivi des appels IA pour le rate limiting
-- Exécuter dans Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_time_idx
  ON public.ai_usage_log (user_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own usage" ON public.ai_usage_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own usage" ON public.ai_usage_log
  FOR SELECT USING (auth.uid() = user_id);
