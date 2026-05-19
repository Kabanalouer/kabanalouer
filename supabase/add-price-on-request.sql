-- Add price_on_request to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_on_request boolean DEFAULT false;
