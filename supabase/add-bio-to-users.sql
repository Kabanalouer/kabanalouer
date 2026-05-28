-- Add bio column to public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio TEXT;
