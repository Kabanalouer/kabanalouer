-- Rappel unique (30 jours avant expires_at) pour les abonnements payants
-- qui se renouvellent automatiquement via Stripe — distinct de la séquence
-- de 3 rappels pour l'offre de lancement gratuite (qui doit renouveler
-- activement). Réinitialisé par le même mécanisme reminder_cycle_expires_at
-- déjà en place.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS reminder_auto_renewal_sent BOOLEAN NOT NULL DEFAULT false;
