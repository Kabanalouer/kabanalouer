-- Run this in the Supabase SQL editor.
-- Adds columns needed for the paid featured-listing flow (host_id, expires_at, Stripe tracing).

ALTER TABLE public.featured_listings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.users(id);
