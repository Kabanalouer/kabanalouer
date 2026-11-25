-- Admin → Brouillons : bouton « Retirer » (2026-11-25). Une adresse retirée ne reçoit plus d'invitation ni de relance
-- (envoi à la main, « Tout envoyer » et avis de relances dues du cron). Rien n'est supprimé : « Rétablir » remet la date à NULL.
-- À appliquer AVANT le déploiement du code (la lecture des notes demande cette colonne).
ALTER TABLE public.draft_invitation_notes ADD COLUMN IF NOT EXISTS contact_stopped_at timestamptz;
