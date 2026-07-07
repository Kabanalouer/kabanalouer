-- Séquence de retour (win-back) pour les annonces dépubliées automatiquement
-- à cause de l'abonnement. unpublished_at ancre le décompte ; les deux
-- booléens sont posés/remis à zéro dans le MÊME UPDATE que unpublished_at
-- (cron de dépublication ou webhook Stripe de republication), pour rester
-- toujours synchronisés entre eux et éviter les faux positifs sur un
-- deuxième cycle de dépublication/republication.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_winback_3d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_winback_14d_sent BOOLEAN NOT NULL DEFAULT false;
