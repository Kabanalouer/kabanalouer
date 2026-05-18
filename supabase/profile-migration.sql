-- Migration: colonnes profil sur users
-- À exécuter dans Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS notifications_prefs jsonb NOT NULL DEFAULT '{}';
