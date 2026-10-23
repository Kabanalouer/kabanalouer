-- Séquence d'accueil des proprios (2026-10-23) : suivi des courriels « photo de profil et présentation »
-- (24 h) et « chambres » (4 jours). Le courriel « textos » (8 jours) garde users.install_app_email_sent_at.
-- Migration ADDITIVE. Annulation : add-host-tip-emails_rollback.sql.
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_tip_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rooms_tip_email_sent_at timestamptz;
NOTIFY pgrst, 'reload schema';
COMMIT;
