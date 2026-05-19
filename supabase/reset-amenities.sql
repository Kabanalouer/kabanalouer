-- Reset all listings amenities to empty array
-- Run this to force hosts to re-select amenities with the new canonical names
UPDATE listings SET amenities = '[]';
