-- Mémoire des étapes payantes de l'import (verdict de filigrane par photo, description d'une ligne de la
-- file) : une reprise de l'import ne repaie pas l'IA pour ce qui a déjà été fait. Serveur seulement
-- (RLS sans politique). Migration ADDITIVE. Annulation : add-import-step-cache_rollback.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.import_step_cache (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_step_cache ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

COMMIT;
