-- Migration : ajouter host_reply à la table reviews
-- Coller dans : Supabase Dashboard → SQL Editor → New query → Run

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS host_reply TEXT;
