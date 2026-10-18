-- Annulation de add-unclaimed-listings.sql.
-- ATTENTION : supprime les colonnes et tables de revendication, donc toute
-- donnée qu'elles contiennent (fiches non revendiquées, jetons, demandes).
-- À lancer seulement après avoir vérifié qu'aucune fiche n'a claim_status non nul
-- (SELECT count(*) FROM public.listings WHERE claim_status IS NOT NULL;).

BEGIN;

DROP FUNCTION IF EXISTS public.claim_listings(uuid, uuid[], uuid, timestamptz);

DROP TRIGGER IF EXISTS record_import_exclusion ON public.listings;
DROP FUNCTION IF EXISTS public.record_import_exclusion();

DROP TABLE IF EXISTS public.import_exclusions;
DROP TABLE IF EXISTS public.claim_email_log;
DROP TABLE IF EXISTS public.claim_requests;
DROP TABLE IF EXISTS public.listing_claim_tokens;

DROP TRIGGER IF EXISTS protect_listing_claim_columns ON public.listings;
DROP FUNCTION IF EXISTS public.protect_listing_claim_columns();

DROP POLICY IF EXISTS "Fiches de test lisibles par lien" ON public.listings;

DROP INDEX IF EXISTS public.listings_unclaimed_publish_idx;
DROP INDEX IF EXISTS public.listings_claim_email_idx;
DROP INDEX IF EXISTS public.listings_import_dedupe_idx;

-- Les contraintes et le GRANT partent avec les colonnes.
ALTER TABLE public.listings
  DROP COLUMN IF EXISTS is_test,
  DROP COLUMN IF EXISTS claimed_by,
  DROP COLUMN IF EXISTS claimed_at,
  DROP COLUMN IF EXISTS claim_language,
  DROP COLUMN IF EXISTS claim_email,
  DROP COLUMN IF EXISTS claim_status;

DROP TRIGGER IF EXISTS protect_users_is_system ON public.users;
DROP FUNCTION IF EXISTS public.protect_users_is_system();
ALTER TABLE public.users DROP COLUMN IF EXISTS is_system;

NOTIFY pgrst, 'reload schema';

COMMIT;
