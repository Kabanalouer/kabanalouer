-- Étape 3/10 de la restructuration "abonnement par annonce". Backfill des
-- lignes subscriptions existantes créées avant la restructuration.
--
-- Confirmé le 2026-07-07 (requête de vérification, 0 ligne retournée) :
-- aucun proprio actif n'a plusieurs annonces sous un même abonnement — donc
-- chaque ligne existante correspond sans ambiguïté à l'annonce la plus
-- ancienne de ce proprio, pas de cas "grandfathered" à gérer.
--
-- Run in Supabase Dashboard → SQL Editor, APRÈS
-- add-subscriptions-listing-id-column.sql. Sans effet sur les lignes déjà
-- backfillées (idempotent).

UPDATE public.subscriptions s
SET listing_id = (
  SELECT l.id FROM public.listings l
  WHERE l.host_id = s.user_id
  ORDER BY l.created_at ASC
  LIMIT 1
)
WHERE s.listing_id IS NULL;

UPDATE public.subscriptions
SET price_tier = 'free', price_cents = 0
WHERE is_free_launch = true AND price_tier IS NULL;

UPDATE public.subscriptions
SET price_tier = 'tier1', price_cents = 29900
WHERE is_free_launch = false AND price_tier IS NULL;
