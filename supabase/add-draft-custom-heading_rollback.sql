-- Annule add-draft-custom-heading.sql
ALTER TABLE public.draft_invitation_notes DROP CONSTRAINT IF EXISTS draft_invitation_notes_custom_heading_len;
ALTER TABLE public.draft_invitation_notes DROP COLUMN IF EXISTS custom_heading;
