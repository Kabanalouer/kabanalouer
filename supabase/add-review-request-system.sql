-- ============================================================
-- KABANALOUER — Système d'avis automatique par courriel (item #8)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TABLE : review_requests ───────────────────────────────
-- Suit l'état de chaque relance d'avis par courriel, par trio
-- listing/voyageur/proprio. Accès exclusivement via le client service-role
-- (cron + routes basées sur token) — le voyageur n'est jamais connecté dans
-- ce flux, donc aucune policy RLS publique/authentifiée n'est nécessaire.

CREATE TABLE public.review_requests (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id            UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  traveler_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  host_id               UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'prompted'
                          CHECK (status IN ('prompted', 'awaiting_stay_review', 'stay_prompted', 'completed', 'expired')),
  check_out             DATE,                          -- copié du 1er message du fil, s'il existe
  token                 TEXT UNIQUE NOT NULL,           -- inclus dans les liens de courriel, usage unique par action
  token_expires_at      TIMESTAMPTZ NOT NULL,           -- 30 jours après check_out (ou après l'envoi si pas de check_out)
  echange_submitted_at  TIMESTAMPTZ,                    -- avis 'echange' déjà soumis avec ce token ? (anti-rejeu)
  prompted_at           TIMESTAMPTZ,
  stay_prompted_at      TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,                    -- avis 'sejour' soumis (fin du volet séjour)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, traveler_id, host_id)               -- une seule relance par trio, jamais de doublon
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
-- Volontairement aucune policy : seul le client service-role (cron, routes
-- token) accède à cette table, jamais via les clés anon/authenticated.

CREATE INDEX idx_review_requests_status ON public.review_requests(status);
CREATE INDEX idx_review_requests_check_out ON public.review_requests(check_out);


-- ── COLONNE : reviews.review_type ─────────────────────────
-- Distingue l'avis "échange" (contact avec le proprio) de l'avis "séjour"
-- (après une réservation confirmée). Les avis déjà en base retombent sur
-- 'echange' par défaut — DEFAULT s'applique aussi aux lignes existantes lors
-- du ADD COLUMN.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_type TEXT NOT NULL DEFAULT 'echange'
    CHECK (review_type IN ('echange', 'sejour'));

-- Un voyageur peut désormais laisser JUSQU'À 2 avis par chalet (un par type,
-- cumulables) — remplace l'ancienne contrainte qui n'en permettait qu'un
-- seul au total par chalet.
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_author_id_key;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_listing_author_type_key UNIQUE (listing_id, author_id, review_type);
