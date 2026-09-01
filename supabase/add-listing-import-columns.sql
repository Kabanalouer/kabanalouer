-- Import d'annonces depuis Airbnb/VRBO (Apify) — phase 1.
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor.

-- Plateforme source de l'import ('airbnb' ou 'vrbo'), et URL d'origine collée
-- par le proprio. NULL pour les annonces créées sur mesure (comportement
-- inchangé).
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS import_source_url TEXT;

-- Statut du brouillon importé : 'pending_review' à la création, 'published'
-- une fois publié par l'admin. NULL pour les annonces créées sur mesure.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS import_status TEXT;

-- Confirmation par le proprio qu'il détient les droits sur les photos
-- importées — cochée obligatoirement avant l'import, jamais présumée vraie
-- par défaut.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS photos_rights_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Données brutes scrapées non mappées vers les colonnes structurées
-- (équipements et région non reconnus dans nos listes fermées) — pour qu'un
-- futur écran de révision admin puisse les afficher et les ajouter
-- manuellement si pertinent. NULL pour les annonces créées sur mesure.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS import_raw_data JSONB;
