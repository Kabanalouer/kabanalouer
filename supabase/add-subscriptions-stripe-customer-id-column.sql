-- Adds the stripe_customer_id column to subscriptions.
-- The column is defined in schema.sql and referenced by app/api/stripe/webhook/route.ts,
-- but was never actually created in the live database (PGRST204 / 42703 confirmed it's missing).
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
