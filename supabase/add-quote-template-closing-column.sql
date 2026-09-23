-- ============================================================
-- KABANALOUER — Modèle de fermeture de devis réutilisable (par proprio)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- Un seul modèle global par proprio (pas par annonce). Ne stocke QUE la
-- section personnalisable du devis structuré (à partir de "COMMENT
-- RÉSERVER ?" jusqu'à la signature) — jamais les blocs Dates/Nombre de
-- voyageurs/Prix, toujours régénérés avec les vraies données à chaque
-- devis. Voir components/messages/QuoteWidget.tsx.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS quote_template_closing TEXT;
