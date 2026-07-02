-- Adds is_free_launch column to subscriptions table if it doesn't exist yet.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_free_launch BOOLEAN NOT NULL DEFAULT FALSE;
