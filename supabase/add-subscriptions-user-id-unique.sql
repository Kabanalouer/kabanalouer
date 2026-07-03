-- Adds a UNIQUE constraint on subscriptions.user_id.
-- Required because app/api/stripe/webhook/route.ts (and 2 other routes) upsert
-- with { onConflict: "user_id" }, which silently fails with Postgres error 42P10
-- ("no unique or exclusion constraint matching the ON CONFLICT specification")
-- without this constraint — Stripe payments succeed but the subscription never
-- activates in the database.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
