-- ============================================================
-- KABANALOUER — Notification courriel "nouveau message" (Phase 2a)
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor
-- ============================================================

-- Anti-doublon pour le cron de notification (toutes les 5 minutes) — un
-- message déjà notifié (ou dont le groupe a été traité, même sans envoi
-- parce que lu entre-temps) ne doit jamais être réévalué.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;
