-- Traduction automatique des messages (FR/EN) via Google Cloud Translation.
-- À exécuter manuellement dans Supabase Dashboard → SQL Editor.

-- Traduction générée pour un message, et langue cible de cette traduction
-- (toujours la langue du destinataire au moment de l'envoi — 'fr' ou 'en').
-- Reste NULL si les langues expéditeur/destinataire étaient identiques, si le
-- destinataire avait désactivé la traduction, ou si l'appel à l'API a échoué.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content_translated TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS translated_language TEXT;

-- Réglage global par utilisateur (pas par conversation) : contrôle si LES
-- MESSAGES REÇUS par cet utilisateur sont traduits automatiquement. Activé
-- par défaut.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS translation_enabled BOOLEAN NOT NULL DEFAULT true;
