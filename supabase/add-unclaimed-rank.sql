-- Classement dans la recherche : les annonces normales et revendiquées passent
-- avant les fiches non revendiquées, à critères égaux. Colonne calculée
-- (0 = normale ou revendiquée, 1 = non revendiquée) pour trier côté base :
-- avec une limite de résultats, trier en JavaScript laisserait les fiches
-- importées prendre toutes les places.
-- Additive. Annulation : add-unclaimed-rank_rollback.sql.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS unclaimed_rank smallint
  GENERATED ALWAYS AS (CASE WHEN claim_status = 'unclaimed' THEN 1 ELSE 0 END) STORED;

-- Trier par une colonne exige le droit de la lire.
GRANT SELECT (unclaimed_rank) ON public.listings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
