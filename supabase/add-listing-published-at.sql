-- Date de la première mise en ligne d'une annonce par son proprio (remplace la date du premier abonnement,
-- qui servait de repère à la séquence d'accueil). Colonne privée : aucun GRANT, lue par le serveur seulement.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.listings l
   SET published_at = s.created_at
  FROM public.subscriptions s
 WHERE s.listing_id = l.id AND l.published_at IS NULL;
