-- Objet et texte de l'invitation brouillon propres à un propriétaire (Admin → Brouillons) — migration ADDITIVE.
-- Annulation : add-draft-custom-text_rollback.sql.
--
-- Facultatifs : vides, l'invitation utilise le modèle d'Admin → Séquences courriel. Remplis, ils remplacent l'objet et le
-- texte du modèle pour cette adresse seulement (les relances J+3 et J+10 gardent toujours les modèles).
-- La table reste réservée au serveur (RLS sans politique, aucun GRANT) : rien d'autre à régler.

ALTER TABLE public.draft_invitation_notes
  ADD COLUMN IF NOT EXISTS custom_subject text,
  ADD COLUMN IF NOT EXISTS custom_body text;

ALTER TABLE public.draft_invitation_notes
  ADD CONSTRAINT draft_invitation_notes_custom_subject_len
    CHECK (custom_subject IS NULL OR char_length(custom_subject) <= 200),
  ADD CONSTRAINT draft_invitation_notes_custom_body_len
    CHECK (custom_body IS NULL OR char_length(custom_body) <= 5000);
