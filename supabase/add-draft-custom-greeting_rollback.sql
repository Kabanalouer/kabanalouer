-- Annule add-draft-custom-greeting.sql
ALTER TABLE public.draft_invitation_notes
  DROP CONSTRAINT IF EXISTS draft_invitation_notes_custom_greeting_len,
  DROP COLUMN IF EXISTS custom_greeting;
