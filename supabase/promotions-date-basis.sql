-- Appliquée le 2026-09-28 (migration promotions_add_date_basis).
-- "stay" = la promo vise des dates de séjour ; "booking" = la réservation doit
-- être faite entre start_date et end_date.
ALTER TABLE public.promotions
  ADD COLUMN date_basis text NOT NULL DEFAULT 'stay'
  CHECK (date_basis IN ('stay', 'booking'));
