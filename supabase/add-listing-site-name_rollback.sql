-- Annule add-listing-site-name.sql (efface les noms de site enregistrés).
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_site_name_len;
ALTER TABLE public.listings DROP COLUMN IF EXISTS site_name;
