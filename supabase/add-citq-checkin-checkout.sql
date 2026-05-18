-- Add CITQ number and check-in/check-out times to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS citq_number   text,
  ADD COLUMN IF NOT EXISTS checkin_time  text DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS checkout_time text DEFAULT '11:00';
