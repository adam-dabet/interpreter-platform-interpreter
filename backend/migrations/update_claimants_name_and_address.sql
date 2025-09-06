-- Migration: Update claimants table to separate name fields and add address coordinates
-- Date: 2025-08-30

-- Add new columns for separated name fields
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Add address coordinate columns for Google Maps integration
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS address_latitude DECIMAL(10, 8);
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS address_longitude DECIMAL(11, 8);

-- Update existing records to split the name field
UPDATE claimants 
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          substring(name from 1 for position(' ' in name) - 1)
        ELSE name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          substring(name from position(' ' in name) + 1)
        ELSE NULL
      END
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Make name field nullable since we'll use first_name and last_name
ALTER TABLE claimants ALTER COLUMN name DROP NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claimants_first_name ON claimants(first_name);
CREATE INDEX IF NOT EXISTS idx_claimants_last_name ON claimants(last_name);
CREATE INDEX IF NOT EXISTS idx_claimants_address_coords ON claimants(address_latitude, address_longitude);

-- Add comments for documentation
COMMENT ON COLUMN claimants.first_name IS 'First name of the claimant';
COMMENT ON COLUMN claimants.last_name IS 'Last name of the claimant';
COMMENT ON COLUMN claimants.address_latitude IS 'Latitude coordinate of the address (for Google Maps integration)';
COMMENT ON COLUMN claimants.address_longitude IS 'Longitude coordinate of the address (for Google Maps integration)';

-- Update the existing name index to include the new name fields
DROP INDEX IF EXISTS idx_claimants_name;
CREATE INDEX IF NOT EXISTS idx_claimants_full_name ON claimants(first_name, last_name);

