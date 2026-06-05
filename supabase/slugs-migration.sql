ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS slug_fr TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS slug_en TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_fr_unique ON public.listings(slug_fr) WHERE slug_fr IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_en_unique ON public.listings(slug_en) WHERE slug_en IS NOT NULL;
