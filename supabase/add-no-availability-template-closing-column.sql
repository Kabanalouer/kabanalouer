-- ============================================================
-- KABANALOUER — Modèle de fermeture réutilisable pour la réponse
-- "Plus de disponibilités" (par proprio)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- Même principe que quote_template_closing (add-quote-template-closing-column.sql) :
-- un seul modèle global par proprio, réutilisé pour tous ses chalets. Ne
-- stocke que la section personnalisable (à partir de "J'ai bien reçu votre
-- demande de devis..." jusqu'à la signature) — jamais la salutation
-- d'ouverture ni la phrase de remerciement, toujours régénérées avec les
-- vraies données de la conversation. Voir components/messages/NoAvailabilityWidget.tsx.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS no_availability_template_closing TEXT;
