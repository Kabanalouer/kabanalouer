-- ============================================================
-- KABANALOUER — Répartition des voyageurs sur la demande de devis initiale
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- num_guests (déjà existant) reste le total unique, inchangé — ces 4
-- colonnes ajoutent la répartition par catégorie, capturée dès la demande
-- de devis initiale (ContactForm.tsx), pour que le devis structuré du
-- proprio (QuoteWidget.tsx) puisse l'afficher sans reparser le texte libre.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS num_adults INTEGER,
  ADD COLUMN IF NOT EXISTS num_children INTEGER,
  ADD COLUMN IF NOT EXISTS num_babies INTEGER,
  ADD COLUMN IF NOT EXISTS num_pets INTEGER;
