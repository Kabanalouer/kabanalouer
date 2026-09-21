-- Ajoute le nom d'entreprise optionnel (facturation) au profil proprio.
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor.
-- NON EXÉCUTÉ AUTOMATIQUEMENT — en attente d'approbation (voir conversation).

alter table users add column if not exists company_name text;
