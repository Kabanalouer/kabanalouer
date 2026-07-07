-- Notification unique quand un paiement Stripe échoue (status passe à
-- 'past_due'). Le webhook remet ce flag à false dès que le statut change
-- pour autre chose que 'past_due' (récupération ou annulation) — pas besoin
-- du mécanisme reminder_cycle_expires_at, qui suit expires_at (une notion
-- différente : "combien de temps avant l'échéance", pas "le dernier
-- paiement a-t-il échoué").
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS reminder_past_due_sent BOOLEAN NOT NULL DEFAULT false;
