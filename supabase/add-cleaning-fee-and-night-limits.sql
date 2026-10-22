-- Frais de ménage et durée du séjour (Infos générales, 2026-10-22). Migration ADDITIVE : aucune donnée
-- existante n'est modifiée (NULL = non précisé, rien n'est affiché sur la fiche publique).
--   cleaning_fee_included : true = inclus, false = en plus (alors cleaning_fee_amount = prix par séjour)
--   min_nights / max_nights : nombre de nuits minimum et maximum, 1 à 365
-- Annulation : add-cleaning-fee-and-night-limits_rollback.sql.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS cleaning_fee_included boolean,
  ADD COLUMN IF NOT EXISTS cleaning_fee_amount integer,
  ADD COLUMN IF NOT EXISTS min_nights integer,
  ADD COLUMN IF NOT EXISTS max_nights integer;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_cleaning_fee_check CHECK (
    (cleaning_fee_included IS DISTINCT FROM false AND cleaning_fee_amount IS NULL)
    OR (cleaning_fee_included = false AND (cleaning_fee_amount IS NULL OR cleaning_fee_amount BETWEEN 1 AND 99999))
  ),
  ADD CONSTRAINT listings_min_nights_check CHECK (min_nights IS NULL OR min_nights BETWEEN 1 AND 365),
  ADD CONSTRAINT listings_max_nights_check CHECK (max_nights IS NULL OR max_nights BETWEEN 1 AND 365),
  ADD CONSTRAINT listings_nights_order_check CHECK (min_nights IS NULL OR max_nights IS NULL OR max_nights >= min_nights);

-- Colonnes lues par la fiche publique et le tableau de bord (voir lib/listingColumns.ts)
GRANT SELECT (cleaning_fee_included, cleaning_fee_amount, min_nights, max_nights)
  ON public.listings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
