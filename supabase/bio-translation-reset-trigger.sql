-- Présentation modifiée → traductions vidées, peu importe le client qui a
-- sauvegardé (ex. onglet resté sur une ancienne version du site). Le cron
-- translate-listings (bio_en IS NULL) détecte ensuite la langue et retraduit.
-- Si la même sauvegarde fournit elle-même une traduction (génération IA),
-- on la garde.
CREATE OR REPLACE FUNCTION public.reset_bio_translations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    IF NEW.bio_en IS NOT DISTINCT FROM OLD.bio_en THEN
      NEW.bio_en := NULL;
    END IF;
    IF NEW.bio_fr IS NOT DISTINCT FROM OLD.bio_fr THEN
      NEW.bio_fr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_bio_translations ON public.users;
CREATE TRIGGER reset_bio_translations
  BEFORE UPDATE OF bio ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.reset_bio_translations();

-- Remet en file la présentation modifiée par un onglet resté sur l'ancien code.
UPDATE public.users SET bio_en = NULL, bio_fr = NULL
WHERE email = 'slemay@authentik.com';
