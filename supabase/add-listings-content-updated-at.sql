-- Date de dernière modification réelle du contenu d'une annonce, pour le
-- <lastmod> du sitemap (app/sitemap.ts). Ignore les colonnes techniques mises
-- à jour automatiquement (compteur de vues, synchro iCal, rappels, etc.) : sinon
-- chaque visite ferait croire à Google que la fiche a changé.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

UPDATE public.listings SET content_updated_at = created_at WHERE content_updated_at IS NULL;

ALTER TABLE public.listings
  ALTER COLUMN content_updated_at SET DEFAULT now(),
  ALTER COLUMN content_updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.listings_touch_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ignored text[] := ARRAY[
    'content_updated_at', 'ical_last_sync', 'draft_reminder_sent_at',
    'unpublished_at', 'unpublished_reason', 'import_status'
  ];
BEGIN
  IF (
    SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    FROM jsonb_each(to_jsonb(NEW))
    WHERE key <> ALL (ignored) AND key NOT LIKE 'views_%' AND key NOT LIKE 'reminder_%'
  ) IS DISTINCT FROM (
    SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    FROM jsonb_each(to_jsonb(OLD))
    WHERE key <> ALL (ignored) AND key NOT LIKE 'views_%' AND key NOT LIKE 'reminder_%'
  ) THEN
    NEW.content_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_touch_content_updated_at ON public.listings;
CREATE TRIGGER listings_touch_content_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_touch_content_updated_at();
