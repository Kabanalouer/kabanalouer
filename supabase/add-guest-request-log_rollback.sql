-- Annulation de add-guest-request-log.sql (supprime le journal des demandes sans compte).
BEGIN;
DROP TABLE IF EXISTS public.guest_request_log;
NOTIFY pgrst, 'reload schema';
COMMIT;
