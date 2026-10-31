-- Invitations brouillon envoyées à la main (Admin → Brouillons) — migration ADDITIVE.
-- Annulation : add-draft-invitation-notes_rollback.sql.
--
-- Une ligne par adresse de propriétaire : la phrase d'ouverture personnalisée du courriel d'invitation (selon son
-- site web), le site d'origine, et le suivi des notifications de relance envoyées à Simon (une seule par relance).
-- Table réservée au serveur : RLS activée sans aucune politique, aucun GRANT (jamais lisible avec la clé anon
-- ni une session).

BEGIN;

CREATE TABLE IF NOT EXISTS public.draft_invitation_notes (
  claim_email text PRIMARY KEY,
  intro_fr text,
  intro_en text,
  site_url text,
  reminder_3_notified_at timestamptz,
  reminder_10_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT draft_invitation_notes_email_lower CHECK (claim_email = lower(claim_email)),
  CONSTRAINT draft_invitation_notes_intro_fr_len CHECK (intro_fr IS NULL OR char_length(intro_fr) <= 600),
  CONSTRAINT draft_invitation_notes_intro_en_len CHECK (intro_en IS NULL OR char_length(intro_en) <= 600)
);

ALTER TABLE public.draft_invitation_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.draft_invitation_notes FROM anon, authenticated;

COMMIT;
