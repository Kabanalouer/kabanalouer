-- Add pets_allowed and smoking_allowed to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS pets_allowed    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false;
