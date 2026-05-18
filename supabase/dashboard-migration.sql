-- Migration: vues sur listings + fonction d'incrément atomique
-- À exécuter dans Supabase SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS views_search  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_listing integer NOT NULL DEFAULT 0;

-- Fonction atomique pour incrémenter views_listing (évite les race conditions)
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE listings
  SET views_listing = views_listing + 1
  WHERE id = p_listing_id AND is_published = true;
$$;
