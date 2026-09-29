-- Présentations bilingues dans les deux sens (2026-09-29) : bio_fr = version
-- française quand l'original (bio) est écrit en anglais. Voir lib/bio.ts.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio_fr text;

-- Nouvelle colonne en dernière position (CREATE OR REPLACE VIEW, sinon 42P16).
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, name, bio, avatar_url, created_at, bio_en, bio_fr
  FROM public.users;

-- Les présentations existantes ont été traduites en supposant du français :
-- on les remet en file pour que le cron détecte leur vraie langue.
UPDATE public.users SET bio_en = NULL WHERE bio IS NOT NULL;
