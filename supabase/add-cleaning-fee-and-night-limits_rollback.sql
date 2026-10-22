-- Annulation de add-cleaning-fee-and-night-limits.sql (supprime les 4 colonnes et leurs contraintes).
BEGIN;
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_cleaning_fee_check,
  DROP CONSTRAINT IF EXISTS listings_min_nights_check,
  DROP CONSTRAINT IF EXISTS listings_max_nights_check,
  DROP CONSTRAINT IF EXISTS listings_nights_order_check,
  DROP COLUMN IF EXISTS cleaning_fee_included,
  DROP COLUMN IF EXISTS cleaning_fee_amount,
  DROP COLUMN IF EXISTS min_nights,
  DROP COLUMN IF EXISTS max_nights;
NOTIFY pgrst, 'reload schema';
COMMIT;
