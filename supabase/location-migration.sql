-- Migration: colonnes de localisation sur listings
-- À exécuter dans Supabase SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS city      text,
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
