-- Migration: Parse existing addresses into separate fields
-- Date: 2025-01-27

-- First, let's see what we have in the address field
-- Then parse addresses that contain city, state, zip patterns

-- Update city, state, zip_code from address field where address contains comma-separated values
UPDATE claimants 
SET 
  city = CASE 
    WHEN address LIKE '%,%' THEN 
      TRIM(SPLIT_PART(SPLIT_PART(address, ',', 1), ' ', -1))
    ELSE city
  END,
  state = CASE 
    WHEN address LIKE '%,%' AND address LIKE '%, %' THEN 
      TRIM(SPLIT_PART(SPLIT_PART(address, ',', 2), ' ', 1))
    ELSE state
  END,
  zip_code = CASE 
    WHEN address LIKE '%,%' AND address LIKE '%, %' THEN 
      TRIM(SPLIT_PART(SPLIT_PART(address, ',', 2), ' ', 2))
    ELSE zip_code
  END
WHERE address IS NOT NULL AND address != '';

-- For addresses with more complex patterns like "Street, City, State ZIP, Country"
UPDATE claimants 
SET 
  city = CASE 
    WHEN address LIKE '%,%,%' THEN 
      TRIM(SPLIT_PART(address, ',', 2))
    ELSE city
  END,
  state = CASE 
    WHEN address LIKE '%,%,%' THEN 
      TRIM(SPLIT_PART(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 1), ',', 1))
    ELSE state
  END,
  zip_code = CASE 
    WHEN address LIKE '%,%,%' THEN 
      TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 2))
    ELSE zip_code
  END
WHERE address IS NOT NULL AND address != '' AND address LIKE '%,%,%';

-- Clean up any remaining empty strings
UPDATE claimants 
SET 
  city = CASE WHEN city = '' THEN NULL ELSE city END,
  state = CASE WHEN state = '' THEN NULL ELSE state END,
  zip_code = CASE WHEN zip_code = '' THEN NULL ELSE zip_code END;

-- Add some sample date_of_injury data for testing
UPDATE claimants 
SET date_of_injury = '2024-01-15'
WHERE id = 1;

UPDATE claimants 
SET date_of_injury = '2024-03-20'
WHERE id = 5;

UPDATE claimants 
SET date_of_injury = '2024-06-10'
WHERE id = 40;

UPDATE claimants 
SET date_of_injury = '2024-08-05'
WHERE id = 196;

UPDATE claimants 
SET date_of_injury = '2024-11-12'
WHERE id = 41;

UPDATE claimants 
SET date_of_injury = '2024-12-01'
WHERE id = 1522;
