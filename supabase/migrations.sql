-- ============================================================
-- KABANALOUER — Migrations post-Phase 3
-- Coller dans SQL Editor → Run
-- ============================================================

-- Colonne pour lier un utilisateur à son compte Stripe
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Activer Supabase Realtime sur la table messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
