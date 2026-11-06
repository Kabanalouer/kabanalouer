-- Personne en copie des courriels de brouillon (invitation et relances) — migration ADDITIVE.
-- Annulation : add-draft-cc-email_rollback.sql.
--
-- Un seul courriel facultatif par adresse de propriétaire (ex. une deuxième personne qui gère les chalets). Il reçoit en copie
-- (cc) l'invitation et les relances envoyées depuis Admin → Brouillons. La table reste réservée au serveur
-- (RLS sans politique, aucun GRANT) : rien d'autre à régler.

ALTER TABLE public.draft_invitation_notes
  ADD COLUMN IF NOT EXISTS cc_email text;

ALTER TABLE public.draft_invitation_notes
  ADD CONSTRAINT draft_invitation_notes_cc_email_len
    CHECK (cc_email IS NULL OR char_length(cc_email) <= 254);
