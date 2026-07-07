-- Suivi des rappels de renouvellement (30j / 10j / 3j avant expires_at).
-- reminder_cycle_expires_at mémorise à quel expires_at les 3 booléens
-- correspondent — le cron réinitialise automatiquement ce cycle dès que
-- expires_at change (renouvellement Stripe ou conversion offre gratuite → payant).
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS reminder_30d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_10d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_3d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_cycle_expires_at TIMESTAMPTZ;
