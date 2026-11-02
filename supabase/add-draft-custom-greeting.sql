-- Salutation (« Bonjour, ») de l'invitation brouillon propre à un propriétaire — migration ADDITIVE.
-- Annulation : add-draft-custom-greeting_rollback.sql. Complète add-draft-custom-text.sql.
-- Facultative : vide, l'invitation utilise la salutation du modèle. Table réservée au serveur (RLS sans politique).

ALTER TABLE public.draft_invitation_notes
  ADD COLUMN IF NOT EXISTS custom_greeting text;

ALTER TABLE public.draft_invitation_notes
  ADD CONSTRAINT draft_invitation_notes_custom_greeting_len
    CHECK (custom_greeting IS NULL OR char_length(custom_greeting) <= 200);
