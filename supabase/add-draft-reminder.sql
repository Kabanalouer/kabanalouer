-- Rappel « complète ton annonce » envoyé une seule fois par brouillon, 48 h
-- après sa création (cron host-onboarding-emails). NULL = pas encore envoyé.
alter table public.listings
  add column if not exists draft_reminder_sent_at timestamptz;
