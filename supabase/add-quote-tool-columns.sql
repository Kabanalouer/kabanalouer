-- ============================================================
-- KABANALOUER — Outil de devis structuré (optionnel)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── listings ───────────────────────────────────────────────
-- Contenu du devis, réutilisable, rempli une seule fois par le proprio
-- dans la section "Devis" de l'éditeur d'annonce.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS quote_inclusions JSONB,             -- tableau de chaînes, ex: ["Draps et serviettes", "Bois de foyer"]
  ADD COLUMN IF NOT EXISTS quote_exclusions JSONB,              -- tableau de chaînes, ex: ["Frais de ménage"]
  ADD COLUMN IF NOT EXISTS quote_booking_instructions TEXT;     -- modalités de réservation, texte libre


-- ── messages ───────────────────────────────────────────────
-- check_in/check_out/num_guests : capturés dès la demande de devis initiale
-- (bouton "Demande de devis" sur la fiche du chalet), pour pouvoir générer
-- un devis structuré sans avoir à reparser le texte du message.
--
-- quote_data : présent uniquement sur le message de réponse du proprio quand
-- il utilise le widget "Devis structuré" — permet au frontend d'afficher une
-- carte visuelle au lieu d'une bulle de texte simple. `content` reste rempli
-- avec une version texte de repli.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS check_in DATE,
  ADD COLUMN IF NOT EXISTS check_out DATE,
  ADD COLUMN IF NOT EXISTS num_guests INTEGER,
  ADD COLUMN IF NOT EXISTS quote_data JSONB;
