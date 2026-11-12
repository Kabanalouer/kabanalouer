-- Remet le garde-fou « abonnement actif requis pour publier » (état du 2026-10-08).
CREATE OR REPLACE FUNCTION public.protect_listing_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NEW.is_published = true
     AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM true)
     AND NOT EXISTS (
       SELECT 1 FROM subscriptions s
       WHERE s.listing_id = NEW.id AND s.status = 'active'
         AND (s.expires_at IS NULL OR s.expires_at > now())
     ) THEN
    RAISE EXCEPTION 'Un abonnement actif est requis pour publier' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_listing_publication() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS protect_listing_publication ON public.listings;
CREATE TRIGGER protect_listing_publication
  BEFORE INSERT OR UPDATE OF is_published ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_publication();
