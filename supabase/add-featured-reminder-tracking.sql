-- Run this in the Supabase SQL editor.
-- Adds tracking columns for the featured-listing reminder/expiration email sequence.

ALTER TABLE public.featured_listings
  ADD COLUMN IF NOT EXISTS reminder_3d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_email_sent_at TIMESTAMPTZ;
