-- Annulation de add-draft-mode.sql.
-- ATTENTION : supprime la colonne mode_publication ; les fiches en brouillon ne seraient plus
-- reconnues comme telles (le cron publish-unclaimed pourrait les publier) et les invitations
-- 'draft_*' sont supprimées. À n'utiliser qu'après avoir retiré le code qui s'en sert.

BEGIN;

DELETE FROM public.listing_invitations WHERE kind IN ('draft_invite', 'draft_reminder_3', 'draft_reminder_10');

ALTER TABLE public.listing_invitations
  DROP CONSTRAINT IF EXISTS listing_invitations_kind_check;
ALTER TABLE public.listing_invitations
  ADD CONSTRAINT listing_invitations_kind_check CHECK (kind IN ('invite', 'reminder'));

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

DROP INDEX IF EXISTS public.listings_draft_email_idx;
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mode_publication_check;
ALTER TABLE public.listings DROP COLUMN IF EXISTS mode_publication;

NOTIFY pgrst, 'reload schema';

COMMIT;
