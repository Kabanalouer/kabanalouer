-- Annulation de add-host-tip-emails.sql
BEGIN;
ALTER TABLE public.users
  DROP COLUMN IF EXISTS profile_tip_email_sent_at,
  DROP COLUMN IF EXISTS rooms_tip_email_sent_at;
NOTIFY pgrst, 'reload schema';
COMMIT;
