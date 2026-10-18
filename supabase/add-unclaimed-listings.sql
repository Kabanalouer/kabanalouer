-- Fiches non revendiquées (phase 1) — migration ADDITIVE seulement : aucune
-- donnée existante modifiée, aucun DROP. Annulation : add-unclaimed-listings_rollback.sql.
--
-- Principe : un compte « système » (users.is_system) détient temporairement des
-- fiches importées (listings.claim_status = 'unclaimed'). Le vrai propriétaire
-- les revendique par un lien à jeton ; le transfert se fait d'un seul coup par
-- la fonction claim_listings() (serveur seulement).
--
-- Sécurité : les colonnes de revendication sont protégées contre les sessions
-- des visiteurs et des proprios (déclencheurs), claim_email et les nouvelles
-- tables ne sont lisibles que par le serveur (service_role).

BEGIN;

-- 1. Compte système ----------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- La politique « Les utilisateurs modifient leur propre profil » laisserait un
-- utilisateur se donner is_system : colonne protégée comme role/email.
CREATE OR REPLACE FUNCTION public.protect_users_is_system()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NEW.is_system IS DISTINCT FROM OLD.is_system THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_users_is_system ON public.users;
CREATE TRIGGER protect_users_is_system
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_users_is_system();

-- 2. Colonnes de revendication sur listings -----------------------------------
-- claim_status : NULL = annonce normale ; 'unclaimed' = fiche importée détenue
-- par le compte système ; 'claimed' = revendiquée ; 'removed' = retirée à la
-- demande du propriétaire (ne jamais réimporter).
-- is_test : fiche de test (non publiée, lisible par lien, noindex, jamais dans
-- les résultats ni le sitemap puisque non publiée).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS claim_status text,
  ADD COLUMN IF NOT EXISTS claim_email text,
  ADD COLUMN IF NOT EXISTS claim_language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_claim_status_check
    CHECK (claim_status IS NULL OR claim_status IN ('unclaimed', 'claimed', 'removed')),
  ADD CONSTRAINT listings_claim_language_check
    CHECK (claim_language IN ('fr', 'en')),
  ADD CONSTRAINT listings_claim_email_format
    CHECK (claim_email IS NULL OR (claim_email = lower(btrim(claim_email)) AND claim_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  -- Une fiche non revendiquée ne se publie qu'avec un CITQ (6 chiffres) et une
  -- adresse où transmettre les demandes. coalesce : un CITQ NULL doit échouer.
  ADD CONSTRAINT listings_unclaimed_publish_check
    CHECK (claim_status IS DISTINCT FROM 'unclaimed'
           OR is_published IS NOT TRUE
           OR (coalesce(citq_number ~ '^[0-9]{6}$', false) AND claim_email IS NOT NULL)),
  ADD CONSTRAINT listings_test_requires_claim_status
    CHECK (NOT is_test OR claim_status IS NOT NULL);

-- Même fiche importée deux fois = impossible (relancer un import ne crée pas de
-- doublon). Paire CITQ + URL : un CITQ peut couvrir plusieurs unités.
CREATE UNIQUE INDEX IF NOT EXISTS listings_import_dedupe_idx
  ON public.listings (coalesce(citq_number, ''), import_source_url)
  WHERE claim_status IS NOT NULL AND import_source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_claim_email_idx
  ON public.listings (claim_email) WHERE claim_status = 'unclaimed';

CREATE INDEX IF NOT EXISTS listings_unclaimed_publish_idx
  ON public.listings (is_published) WHERE claim_status = 'unclaimed';

-- Colonnes publiques : claim_status (mention « pas encore activée ») et is_test
-- (noindex). claim_email, claim_language, claimed_* restent privées : tout le
-- SELECT a été retiré de la table le 2026-10-08 (protect-listing-private-columns.sql),
-- une nouvelle colonne n'est donc lisible que si on la déclare ici.
GRANT SELECT (claim_status, is_test) ON public.listings TO anon, authenticated;

-- Une fiche de test est lisible par son lien (même non publiée) : c'est ce qui
-- permet d'essayer le parcours voyageur sans la mettre dans la recherche.
DROP POLICY IF EXISTS "Fiches de test lisibles par lien" ON public.listings;
CREATE POLICY "Fiches de test lisibles par lien"
  ON public.listings FOR SELECT
  USING (is_test = true);

-- Les colonnes de revendication ne se modifient que côté serveur : sans ça,
-- un proprio pourrait se remettre claim_status = 'unclaimed' ou changer
-- claim_email (la politique « Les hôtes gèrent leurs listings » laisse tout
-- modifier).
CREATE OR REPLACE FUNCTION public.protect_listing_claim_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.claim_status IS NOT NULL OR NEW.claim_email IS NOT NULL
         OR NEW.claimed_at IS NOT NULL OR NEW.claimed_by IS NOT NULL
         OR NEW.is_test OR NEW.claim_language <> 'fr' THEN
        RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.claim_status IS DISTINCT FROM OLD.claim_status
       OR NEW.claim_email IS DISTINCT FROM OLD.claim_email
       OR NEW.claim_language IS DISTINCT FROM OLD.claim_language
       OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
       OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
       OR NEW.is_test IS DISTINCT FROM OLD.is_test THEN
      RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_listing_claim_columns ON public.listings;
CREATE TRIGGER protect_listing_claim_columns
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_claim_columns();

-- 3. Tables (serveur seulement : RLS activée, aucune politique) ---------------

-- Jetons : jamais stockés en clair (SHA-256), usage unique. kind :
--   claim   : couvre TOUTES les fiches non revendiquées du même claim_email, expire (30 jours)
--   remove  : « Retirer ma fiche » (une fiche, listing_id), sans expiration
--   dispute : « Signaler un problème » après une activation (listing_ids)
CREATE TABLE IF NOT EXISTS public.listing_claim_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  kind          text NOT NULL CHECK (kind IN ('claim', 'remove', 'dispute')),
  claim_email   text NOT NULL,
  listing_id    uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  listing_ids   uuid[],
  expires_at    timestamptz,
  used_at       timestamptz,
  used_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at    timestamptz,
  created_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_tokens_claim_expires CHECK (kind <> 'claim' OR expires_at IS NOT NULL),
  CONSTRAINT claim_tokens_remove_listing CHECK (kind <> 'remove' OR listing_id IS NOT NULL),
  CONSTRAINT claim_tokens_dispute_listings CHECK (kind <> 'dispute' OR listing_ids IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS listing_claim_tokens_email_idx ON public.listing_claim_tokens (claim_email);
CREATE INDEX IF NOT EXISTS listing_claim_tokens_listing_idx ON public.listing_claim_tokens (listing_id);

-- Demandes à traiter par l'admin : preuve d'un propriétaire sans lien (proof) ou
-- signalement après une activation (dispute). Rien ne bouge avant l'approbation.
CREATE TABLE IF NOT EXISTS public.claim_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('proof', 'dispute')),
  listing_id    uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(id) ON DELETE CASCADE,
  contact_email text,
  message       text CHECK (message IS NULL OR char_length(message) <= 5000),
  proof_path    text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'refused', 'handled')),
  admin_note    text,
  reviewed_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_requests_proof_user CHECK (kind <> 'proof' OR user_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_pending_proof_idx
  ON public.claim_requests (listing_id, user_id) WHERE kind = 'proof' AND status = 'pending';
CREATE INDEX IF NOT EXISTS claim_requests_status_idx ON public.claim_requests (status, created_at);

-- Courriels envoyés aux propriétaires non inscrits : plafonds de 3 par jour par
-- fiche et par adresse (kind 'message'), et limites d'envoi du lien (option A).
CREATE TABLE IF NOT EXISTS public.claim_email_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_email text NOT NULL,
  listing_id  uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('message', 'link', 'link_request', 'activation_notice')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS claim_email_log_email_idx ON public.claim_email_log (claim_email, kind, created_at);
CREATE INDEX IF NOT EXISTS claim_email_log_listing_idx ON public.claim_email_log (listing_id, kind, created_at);

-- Fiches à ne jamais réimporter : retirées à la demande du propriétaire, ou
-- supprimées après revendication.
CREATE TABLE IF NOT EXISTS public.import_exclusions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citq_number       text,
  import_source_url text,
  reason            text NOT NULL CHECK (reason IN ('removed_by_owner', 'deleted_after_claim', 'admin')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_exclusions_has_key CHECK (citq_number IS NOT NULL OR import_source_url IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS import_exclusions_key_idx
  ON public.import_exclusions (coalesce(citq_number, ''), coalesce(import_source_url, ''));

ALTER TABLE public.listing_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_email_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_exclusions    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.listing_claim_tokens FROM anon, authenticated;
REVOKE ALL ON public.claim_requests       FROM anon, authenticated;
REVOKE ALL ON public.claim_email_log      FROM anon, authenticated;
REVOKE ALL ON public.import_exclusions    FROM anon, authenticated;

-- Une fiche revendiquée puis supprimée (ou retirée) par son propriétaire ne
-- doit pas revenir à l'import suivant. Les fiches de test sont exclues.
CREATE OR REPLACE FUNCTION public.record_import_exclusion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.claim_status IN ('claimed', 'removed') AND NOT OLD.is_test
     AND (OLD.citq_number IS NOT NULL OR OLD.import_source_url IS NOT NULL) THEN
    INSERT INTO public.import_exclusions (citq_number, import_source_url, reason)
    VALUES (OLD.citq_number, OLD.import_source_url,
            CASE WHEN OLD.claim_status = 'removed' THEN 'removed_by_owner' ELSE 'deleted_after_claim' END)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_import_exclusion() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS record_import_exclusion ON public.listings;
CREATE TRIGGER record_import_exclusion
  BEFORE DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.record_import_exclusion();

-- 4. Transfert d'une revendication, en une seule transaction ------------------
-- Appelée par le serveur (service_role) avec la liste des fiches à transférer.
-- Tout réussit ou rien ne bouge. p_free_launch_expires_at : non NULL = créer
-- l'abonnement gratuit de l'offre de lancement (décidé par le code avec
-- isLaunchOfferActive(), jamais ici). Ne dépublie jamais rien.
CREATE OR REPLACE FUNCTION public.claim_listings(
  p_user_id uuid,
  p_listing_ids uuid[],
  p_token_id uuid DEFAULT NULL,
  p_free_launch_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (out_listing_id uuid, out_claim_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system uuid;
  v_ids uuid[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id AND NOT u.is_system) THEN
    RAISE EXCEPTION 'Compte invalide' USING ERRCODE = '22023';
  END IF;

  -- Jeton d'abord : deux revendications simultanées ne passent pas toutes les deux.
  IF p_token_id IS NOT NULL THEN
    UPDATE listing_claim_tokens t
       SET used_at = now(), used_by = p_user_id
     WHERE t.id = p_token_id AND t.used_at IS NULL AND t.revoked_at IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > now());
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Jeton invalide ou déjà utilisé' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT u.id INTO v_system FROM users u WHERE u.is_system LIMIT 1;

  WITH moved AS (
    UPDATE listings l
       SET host_id = p_user_id, claim_status = 'claimed', claimed_at = now(), claimed_by = p_user_id
     WHERE l.id = ANY (p_listing_ids) AND l.claim_status = 'unclaimed'
    RETURNING l.id
  )
  SELECT coalesce(array_agg(moved.id), '{}') INTO v_ids FROM moved;

  IF coalesce(array_length(v_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Aucune fiche à transférer' USING ERRCODE = '22023';
  END IF;

  -- Les demandes déjà reçues passent au nouveau propriétaire.
  IF v_system IS NOT NULL THEN
    UPDATE messages m SET receiver_id = p_user_id
     WHERE m.listing_id = ANY (v_ids) AND m.receiver_id = v_system;
  END IF;

  IF p_free_launch_expires_at IS NOT NULL THEN
    INSERT INTO subscriptions (listing_id, user_id, stripe_subscription_id, status, expires_at, is_free_launch, price_tier, price_cents)
    SELECT i, p_user_id, NULL, 'active', p_free_launch_expires_at, true, 'free', 0
      FROM unnest(v_ids) AS i
    ON CONFLICT (listing_id) DO NOTHING;
  END IF;

  UPDATE users u SET role = 'host' WHERE u.id = p_user_id AND u.role = 'traveler';

  RETURN QUERY SELECT l.id, l.claim_email FROM listings l WHERE l.id = ANY (v_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_listings(uuid, uuid[], uuid, timestamptz) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.claim_listings(uuid, uuid[], uuid, timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
