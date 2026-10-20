-- Annulation de add-import-step-cache.sql (supprime la mémoire des étapes de l'import).
BEGIN;
DROP TABLE IF EXISTS public.import_step_cache;
NOTIFY pgrst, 'reload schema';
COMMIT;
