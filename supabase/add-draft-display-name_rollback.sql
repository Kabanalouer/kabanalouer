-- Annule add-draft-display-name.sql
ALTER TABLE public.draft_invitation_notes DROP CONSTRAINT IF EXISTS draft_invitation_notes_display_name_len;
ALTER TABLE public.draft_invitation_notes DROP COLUMN IF EXISTS display_name;
