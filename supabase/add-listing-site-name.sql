-- Nom du site / village de chalets (ex. « Au Chalet en Bois Rond ») — migration ADDITIVE.
-- Annulation : add-listing-site-name_rollback.sql.
--
-- Sur la carte, les chalets d'un même site qui partagent la même position sont regroupés en un seul repère ;
-- ce nom s'affiche au clic au lieu du titre d'un chalet au hasard. Colonne publique (lue par la carte, session anonyme),
-- donc GRANT SELECT explicite et ajout à LISTING_PUBLIC_COLUMNS (lib/listingColumns.ts).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS site_name text;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_site_name_len
    CHECK (site_name IS NULL OR char_length(site_name) <= 120);

GRANT SELECT (site_name) ON public.listings TO anon, authenticated;
