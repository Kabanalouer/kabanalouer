-- Annulation de add-import-queue-and-invitations.sql.
-- ATTENTION : supprime la file d'import et l'historique des invitations.

BEGIN;

DROP TABLE IF EXISTS public.listing_invitations;
DROP TABLE IF EXISTS public.listing_import_queue;

NOTIFY pgrst, 'reload schema';

COMMIT;
