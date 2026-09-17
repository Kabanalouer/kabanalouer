-- Remplace le dernier segment d'URL des fiches chalet (basé jusqu'ici sur
-- slug_fr/slug_en, dérivés du titre — cassait à chaque renommage) par un
-- numéro d'annonce stable (assigné une seule fois, à la création) et un lien
-- personnalisé optionnel choisi par le proprio. Voir CLAUDE.md section 9
-- ("URL de fiche chalet — numéro d'annonce stable + lien personnalisé").

-- Numéro d'annonce : entier aléatoire (10000-99999, jamais séquentiel pour
-- ne pas révéler le nombre total d'annonces ni leur ordre de création),
-- assigné à la création de CHAQUE fiche (voir lib/generateListingNumber.ts),
-- jamais changé ensuite.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_number INTEGER;

-- Lien personnalisé optionnel, partagé entre les versions FR et EN d'une
-- même fiche (jamais deux liens distincts par langue).
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS custom_slug TEXT;

-- Garde le dernier lien personnalisé remplacé, pour rediriger proprement
-- l'ancien lien vers la fiche (voir app/chalets/[...segments]/page.tsx)
-- plutôt que de casser un lien déjà partagé/indexé quand le proprio change
-- son lien personnalisé.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS previous_custom_slug TEXT;

-- Index UNIQUE partiels (compatibles avec les lignes existantes qui n'ont
-- encore ni numéro ni lien au moment de l'exécution de cette migration).
CREATE UNIQUE INDEX IF NOT EXISTS listings_listing_number_unique
  ON public.listings (listing_number) WHERE listing_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS listings_custom_slug_unique
  ON public.listings (custom_slug) WHERE custom_slug IS NOT NULL;

-- Backfill ponctuel : assigne un listing_number à la seule fiche déjà
-- publiée au moment de cette migration (776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72,
-- Laurentides/Mille-Isles) — toute nouvelle fiche créée après ce jour reçoit
-- automatiquement le sien à la création (voir lib/generateListingNumber.ts),
-- mais cette fiche existante n'en a pas encore. Résultat attendu :
-- kabanalouer.ca/chalets/laurentides/mille-isles/48347
UPDATE public.listings
SET listing_number = 48347
WHERE id = '776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72' AND listing_number IS NULL;
