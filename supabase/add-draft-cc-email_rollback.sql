-- Annule add-draft-cc-email.sql
ALTER TABLE public.draft_invitation_notes DROP CONSTRAINT IF EXISTS draft_invitation_notes_cc_email_len;
ALTER TABLE public.draft_invitation_notes DROP COLUMN IF EXISTS cc_email;
