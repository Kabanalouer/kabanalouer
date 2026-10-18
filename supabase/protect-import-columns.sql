-- Protection des colonnes d'import de `listings` — migration ADDITIVE (un déclencheur,
-- une fonction remplacée). Annulation : protect-import-columns_rollback.sql.
--
-- Problème : la politique « Les hôtes gèrent leurs listings » laisse un proprio modifier
-- n'importe quelle colonne de ses annonces. Il pouvait donc écrire import_source,
-- import_source_url, import_status ou import_raw_data, par exemple copier l'adresse
-- d'origine d'un autre chalet pour bloquer son import (clé anti-doublon) ou le faire
-- inscrire dans import_exclusions en supprimant sa propre annonce.
--
-- Règle : ces quatre colonnes ne s'écrivent que côté serveur (client service), sauf une
-- transition que le site fait avec la session du proprio : import_status
-- 'pending_review' → 'published' (route /api/listings/[id]/publish).

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_listing_import_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.import_source IS NOT NULL OR NEW.import_source_url IS NOT NULL
         OR NEW.import_status IS NOT NULL OR NEW.import_raw_data IS NOT NULL THEN
        RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.import_source IS DISTINCT FROM OLD.import_source
       OR NEW.import_source_url IS DISTINCT FROM OLD.import_source_url
       OR NEW.import_raw_data IS DISTINCT FROM OLD.import_raw_data
       OR (NEW.import_status IS DISTINCT FROM OLD.import_status
           AND NOT (OLD.import_status = 'pending_review' AND NEW.import_status = 'published')) THEN
      RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_listing_import_columns ON public.listings;
CREATE TRIGGER protect_listing_import_columns
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_import_columns();

-- Une exclusion n'est notée que pour une fiche réellement importée par le serveur :
-- revendiquée ou retirée (claim_status, écrit par le serveur seulement), avec une
-- source et une adresse d'origine (désormais non modifiables par un proprio). Le CITQ,
-- lui, reste modifiable par un proprio : il est gardé pour information, mais l'import
-- ne se fie qu'à l'adresse d'origine pour refuser une fiche.
CREATE OR REPLACE FUNCTION public.record_import_exclusion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.claim_status IN ('claimed', 'removed') AND NOT OLD.is_test
     AND OLD.import_source IS NOT NULL AND OLD.import_source_url IS NOT NULL THEN
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
