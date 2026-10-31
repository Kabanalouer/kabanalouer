-- Mode « brouillon » pour les propriétaires de plusieurs chalets — migration ADDITIVE.
-- Annulation : add-draft-mode_rollback.sql.
--
-- Principe : une fiche importée avec mode_publication = 'brouillon' n'est jamais publiée par le
-- serveur (cron publish-unclaimed) : le propriétaire la voit dans un aperçu privé, la revendique
-- puis l'active lui-même (/api/listings/activate-draft), sans limite quotidienne.
--
-- Sécurité : la colonne est privée (aucun GRANT SELECT : jamais lisible avec la clé anon ni une
-- session, seulement par le client service) et protégée en écriture comme les colonnes de
-- revendication. Un brouillon d'import reste illisible avec la clé anon : la politique de
-- lecture publique de listings exige is_published = true (hors fiches de test).

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS mode_publication text;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_mode_publication_check
    CHECK (mode_publication IS NULL OR mode_publication = 'brouillon');

-- Brouillons : sert au cron d'invitation et à l'aperçu (index partiel, petit).
CREATE INDEX IF NOT EXISTS listings_draft_email_idx
  ON public.listings (claim_email) WHERE mode_publication = 'brouillon';

-- Même protection que les colonnes de revendication : jamais modifiable depuis une session.
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
         OR NEW.is_test OR NEW.claim_language <> 'fr'
         OR NEW.mode_publication IS NOT NULL THEN
        RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.claim_status IS DISTINCT FROM OLD.claim_status
       OR NEW.claim_email IS DISTINCT FROM OLD.claim_email
       OR NEW.claim_language IS DISTINCT FROM OLD.claim_language
       OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
       OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
       OR NEW.is_test IS DISTINCT FROM OLD.is_test
       OR NEW.mode_publication IS DISTINCT FROM OLD.mode_publication THEN
      RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Invitations : trois nouveaux types (invitation brouillon, relances à J+3 et J+10). La clé unique
-- (adresse, type) reste telle quelle : une seule de chaque par adresse.
ALTER TABLE public.listing_invitations
  DROP CONSTRAINT IF EXISTS listing_invitations_kind_check;
ALTER TABLE public.listing_invitations
  ADD CONSTRAINT listing_invitations_kind_check
    CHECK (kind IN ('invite', 'reminder', 'draft_invite', 'draft_reminder_3', 'draft_reminder_10'));

NOTIFY pgrst, 'reload schema';

COMMIT;
