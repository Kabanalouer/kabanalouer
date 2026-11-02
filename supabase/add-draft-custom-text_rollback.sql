-- Annule add-draft-custom-text.sql (efface les textes propres aux propriétaires).
ALTER TABLE public.draft_invitation_notes
  DROP CONSTRAINT IF EXISTS draft_invitation_notes_custom_subject_len,
  DROP CONSTRAINT IF EXISTS draft_invitation_notes_custom_body_len,
  DROP COLUMN IF EXISTS custom_subject,
  DROP COLUMN IF EXISTS custom_body;
