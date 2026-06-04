-- Phase 1 i18n — colonnes bilingues
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'fr';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio_en TEXT;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS amenities_en JSONB;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS nearby_activities_en JSONB;

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';
