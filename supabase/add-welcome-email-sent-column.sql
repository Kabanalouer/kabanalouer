-- Garde anti-doublon pour l'email de bienvenue voyageur (deux chemins de
-- confirmation possibles : email/mot de passe et Google OAuth).
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false;
