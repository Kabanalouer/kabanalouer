-- Add checkin_type to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS checkin_type text DEFAULT 'autonomous'
    CHECK (checkin_type IN ('autonomous', 'in_person'));
