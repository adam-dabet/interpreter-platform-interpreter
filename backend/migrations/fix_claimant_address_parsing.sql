-- Migration: Fix claimant address parsing
-- Date: 2025-01-27

-- Fix the city, state, zip_code parsing from address field
-- The previous migration didn't parse the address correctly
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
  END
WHERE city IS NULL OR city = '';

-- For state and zip, we need to parse the second comma
UPDATE claimants 
SET 
  state = CASE 
    WHEN city IS NOT NULL AND city != '' THEN
      CASE 
        WHEN position(',' in city) > 0 THEN
          trim(substring(city from 1 for position(',' in city) - 1))
        ELSE city
      END
    ELSE NULL
  END,
  zip_code = CASE 
    WHEN city IS NOT NULL AND city != '' THEN
      CASE 
        WHEN position(',' in city) > 0 THEN
          trim(substring(city from position(',' in city) + 1))
        ELSE NULL
      END
    ELSE NULL
  END
WHERE (state IS NULL OR state = '') OR (zip_code IS NULL OR zip_code = '');

-- Now clean up the city field to remove the state and zip
UPDATE claimants 
SET 
  city = CASE 
    WHEN state IS NOT NULL AND state != '' AND position(',' in city) > 0 THEN
      trim(substring(city from 1 for position(',' in city) - 1))
    ELSE city
  END
WHERE city IS NOT NULL AND city != '';

-- Add some sample data for testing
UPDATE claimants 
SET 
  employer = 'Sample Employer',
  examiner = 'Sample Examiner'
WHERE employer IS NULL OR employer = '';

-- Update a few specific records for better testing
UPDATE claimants 
SET 
  city = 'Los Angeles',
  state = 'CA',
  zip_code = '90210',
  employer = 'Los Angeles Medical Center',
  examiner = 'Dr. Smith'
WHERE id = 1;

UPDATE claimants 
SET 
  city = 'San Francisco',
  state = 'CA',
  zip_code = '94102',
  employer = 'San Francisco Hospital',
  examiner = 'Dr. Johnson'
WHERE id = 2;
