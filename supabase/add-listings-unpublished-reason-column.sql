-- Distingue une dépublication automatique (abonnement expiré/annulé) d'une
-- dépublication manuelle (brouillon jamais publié, sauvegarde en brouillon
-- depuis l'éditeur, ou "Désactiver mon compte") — seule la première doit
-- être republiée automatiquement au retour d'un abonnement actif.
-- NULL = manuel ou jamais dépubliée par le système. 'subscription' = écrit
-- uniquement par le cron subscription-reminders et le webhook Stripe.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS unpublished_reason TEXT;
