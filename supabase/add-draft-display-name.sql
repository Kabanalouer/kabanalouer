-- Nom affiché dans l'objet et le titre de l'invitation brouillon (« {nom} sur Kabanalouer ») — migration ADDITIVE.
-- Annulation : add-draft-display-name_rollback.sql.
--
-- Nom du chalet ou du site du propriétaire (ex. « Chalets Zenya »), saisi dans Admin → Brouillons. Facultatif :
-- sans nom, le courriel utilise le titre du chalet (un seul chalet) ou « Titre et N autres chalets ».
-- La table reste réservée au serveur (RLS sans politique, aucun GRANT) : rien d'autre à régler.

ALTER TABLE public.draft_invitation_notes
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.draft_invitation_notes
  ADD CONSTRAINT draft_invitation_notes_display_name_len
    CHECK (display_name IS NULL OR char_length(display_name) <= 120);
