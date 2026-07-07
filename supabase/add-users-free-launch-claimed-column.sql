-- Garde "offre de lancement gratuite réclamée une seule fois dans sa vie",
-- indépendante du statut de l'annonce gratuite par la suite (annulée ou non).
-- NULL = jamais réclamée. Posée une fois à l'activation, jamais effacée.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS free_launch_claimed_at TIMESTAMPTZ;
