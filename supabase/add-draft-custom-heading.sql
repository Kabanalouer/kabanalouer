-- Titre du courriel d'invitation propre à un propriétaire (Admin → Brouillons) — migration ADDITIVE.
-- Annulation : add-draft-custom-heading_rollback.sql.
--
-- Le grand titre du courriel (« Vos chalets sur Kabanalouer ») venait toujours du modèle. Cette colonne facultative permet de le
-- changer pour un propriétaire (ex. « Vos dômes sur Kabanalouer »), comme l'objet, la salutation et le texte (custom_subject,
-- custom_greeting, custom_body). Vide = titre du modèle. La table reste réservée au serveur (RLS sans politique, aucun GRANT).

ALTER TABLE public.draft_invitation_notes
  ADD COLUMN IF NOT EXISTS custom_heading text;

ALTER TABLE public.draft_invitation_notes
  ADD CONSTRAINT draft_invitation_notes_custom_heading_len
    CHECK (custom_heading IS NULL OR char_length(custom_heading) <= 200);
