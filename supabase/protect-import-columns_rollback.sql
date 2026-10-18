-- Annulation de protect-import-columns.sql : retire le déclencheur et remet la
-- version précédente de record_import_exclusion (celle de add-unclaimed-listings.sql).

BEGIN;

DROP TRIGGER IF EXISTS protect_listing_import_columns ON public.listings;
DROP FUNCTION IF EXISTS public.protect_listing_import_columns();

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

NOTIFY pgrst, 'reload schema';

COMMIT;
