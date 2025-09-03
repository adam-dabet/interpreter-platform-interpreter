-- Migration: Fix address parsing with better logic
-- Date: 2025-01-27

-- Reset the fields first
UPDATE claimants 
SET city = NULL, state = NULL, zip_code = NULL;

-- Parse addresses with pattern: "Street, City, State ZIP"
UPDATE claimants 
SET 
  city = TRIM(SPLIT_PART(address, ',', 2)),
  state = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 1)),
  zip_code = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 2))
WHERE address LIKE '%,%,%' AND address NOT LIKE '%,%,%,%';

-- Parse addresses with pattern: "Street, City, State ZIP, Country"
UPDATE claimants 
SET 
  city = TRIM(SPLIT_PART(address, ',', 2)),
  state = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 1)),
  zip_code = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 2))
WHERE address LIKE '%,%,%,%';

-- Parse addresses with pattern: "Street, City State ZIP"
UPDATE claimants 
SET 
  city = TRIM(SPLIT_PART(address, ',', 2)),
  state = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 2), ' ', -2)),
  zip_code = TRIM(SPLIT_PART(SPLIT_PART(address, ',', 2), ' ', -1))
WHERE address LIKE '%,%' AND address NOT LIKE '%,%,%' AND address LIKE '%, % %';

-- Clean up any remaining empty strings
UPDATE claimants 
SET 
  city = CASE WHEN city = '' THEN NULL ELSE city END,
  state = CASE WHEN state = '' THEN NULL ELSE state END,
  zip_code = CASE WHEN zip_code = '' THEN NULL ELSE zip_code END;
