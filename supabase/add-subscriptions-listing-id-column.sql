-- Étape 1/10 de la restructuration "abonnement par annonce" (voir CLAUDE.md).
-- Purement additive : listing_id est nullable pour l'instant, rien ne l'utilise
-- encore, donc aucun risque pour le code existant. Le backfill (étape 3) et le
-- cutover structurel — DROP CONSTRAINT subscriptions_user_id_key, ALTER COLUMN
-- listing_id SET NOT NULL, ADD CONSTRAINT UNIQUE (listing_id) — viendront dans
-- une migration séparée une fois le backfill vérifié.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS price_tier TEXT;
