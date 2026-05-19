-- Add nearby_activities to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS nearby_activities jsonb DEFAULT '[]';
