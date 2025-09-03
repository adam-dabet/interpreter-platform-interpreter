-- Migration: Add missing claimant fields for complete autofill
-- Date: 2025-01-27

-- Add missing address fields to claimants table
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add missing fields for autofill functionality
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS date_of_injury DATE;
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS employer VARCHAR(255);
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS examiner VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claimants_city ON claimants(city);
CREATE INDEX IF NOT EXISTS idx_claimants_state ON claimants(state);
CREATE INDEX IF NOT EXISTS idx_claimants_zip_code ON claimants(zip_code);
CREATE INDEX IF NOT EXISTS idx_claimants_employer ON claimants(employer);
CREATE INDEX IF NOT EXISTS idx_claimants_examiner ON claimants(examiner);

-- Add comments for documentation
COMMENT ON COLUMN claimants.city IS 'City of the claimant';
COMMENT ON COLUMN claimants.state IS 'State of the claimant';
COMMENT ON COLUMN claimants.zip_code IS 'ZIP code of the claimant';
COMMENT ON COLUMN claimants.date_of_injury IS 'Date of injury for the claimant';
COMMENT ON COLUMN claimants.employer IS 'Employer of the claimant';
COMMENT ON COLUMN claimants.examiner IS 'Examiner assigned to the claimant';

-- Update existing records to populate city, state, zip_code from address field if possible
-- This is a basic attempt to extract city/state/zip from the address field
UPDATE claimants 
SET 
  city = CASE 
    WHEN address IS NOT NULL AND address != '' THEN
      CASE 
        WHEN position(',' in address) > 0 THEN
          trim(substring(address from position(',' in address) + 1))
        ELSE NULL
      END
    ELSE NULL
  END,
  state = CASE 
    WHEN address IS NOT NULL AND address != '' THEN
      CASE 
        WHEN position(',' in address) > 0 AND position(',' in substring(address from position(',' in address) + 1)) > 0 THEN
          trim(substring(substring(address from position(',' in address) + 1) from 1 for position(',' in substring(address from position(',' in address) + 1)) - 1))
        ELSE NULL
      END
    ELSE NULL
  END,
  zip_code = CASE 
    WHEN address IS NOT NULL AND address != '' THEN
      CASE 
        WHEN position(',' in address) > 0 AND position(',' in substring(address from position(',' in address) + 1)) > 0 THEN
          trim(substring(substring(address from position(',' in address) + 1) from position(',' in substring(address from position(',' in address) + 1)) + 1))
        ELSE NULL
      END
    ELSE NULL
  END
WHERE city IS NULL OR state IS NULL OR zip_code IS NULL;
