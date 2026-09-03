-- ============================================================
-- KABANALOUER — Réponse par courriel (Phase 2b)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TABLE : email_reply_addresses ─────────────────────────
-- Une ligne par paire d'utilisateurs sur une même annonce — l'adresse
-- conv-{token}@reply.kabanalouer.ca sert de Reply-To sur le courriel de
-- notification "nouveau message" (Phase 2a) et de clé de correspondance
-- pour le webhook de réception (Phase 2b). user_a_id/user_b_id sont
-- toujours stockés normalisés (le plus petit UUID en premier, via
-- LEAST/GREATEST) pour que la même paire retombe sur la même ligne peu
-- importe qui envoie en premier. Accès exclusivement via le client
-- service-role (cron + webhook), jamais via les clés anon/authenticated —
-- même choix que review_requests.

CREATE TABLE public.email_reply_addresses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id    UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_a_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,  -- toujours LEAST(user_a_id, user_b_id)
  user_b_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,  -- toujours GREATEST(user_a_id, user_b_id)
  token         TEXT UNIQUE NOT NULL,   -- court (voir lib/emailReplyAddress.ts) — contrainte RFC 5321 sur la
                                        -- longueur du local-part d'une adresse courriel, différent de
                                        -- review_requests.token qui ne sert que dans des URLs
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, user_a_id, user_b_id)  -- une seule adresse par trio, jamais de doublon
);

ALTER TABLE public.email_reply_addresses ENABLE ROW LEVEL SECURITY;
-- Volontairement aucune policy : seul le client service-role (cron de
-- notification, webhook de réception) accède à cette table.

CREATE INDEX idx_email_reply_addresses_token ON public.email_reply_addresses(token);
