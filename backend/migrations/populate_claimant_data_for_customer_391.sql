-- Migration: Populate missing claimant data for customer 391
-- Date: 2025-01-27

-- First, let's see which claimants customer 391 has access to
-- SELECT DISTINCT c.id, c.first_name, c.last_name, c.address 
-- FROM claimants c 
-- JOIN claims cl ON c.id = cl.claimant_id 
-- WHERE cl.contact_claims_handler_id = 391 OR cl.adjusters_assistant_id = 391;

-- Populate city, state, zip_code for claimants with addresses
UPDATE claimants 
SET 
  city = CASE 
    WHEN address LIKE '%,%' THEN TRIM(SPLIT_PART(address, ',', 2))
    ELSE city
  END,
  state = CASE 
    WHEN address LIKE '%,%' AND address LIKE '%, %' THEN TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 1))
    ELSE state
  END,
  zip_code = CASE 
    WHEN address LIKE '%,%' AND address LIKE '%, %' THEN TRIM(SPLIT_PART(SPLIT_PART(address, ',', 3), ' ', 2))
    ELSE zip_code
  END
WHERE id IN (
  SELECT DISTINCT c.id
  FROM claimants c 
  JOIN claims cl ON c.id = cl.claimant_id 
  WHERE (cl.contact_claims_handler_id = 391 OR cl.adjusters_assistant_id = 391)
    AND address IS NOT NULL AND address != ''
);

-- Add sample date_of_injury data for testing
UPDATE claimants 
SET date_of_injury = '2024-02-15'
WHERE id = 28;

UPDATE claimants 
SET date_of_injury = '2024-03-22'
WHERE id = 51;

UPDATE claimants 
SET date_of_injury = '2024-05-18'
WHERE id = 132;

UPDATE claimants 
SET date_of_injury = '2024-07-30'
WHERE id = 224;

UPDATE claimants 
SET date_of_injury = '2024-09-12'
WHERE id = 284;

-- Clean up any empty strings
UPDATE claimants 
SET 
  city = CASE WHEN city = '' THEN NULL ELSE city END,
  state = CASE WHEN state = '' THEN NULL ELSE state END,
  zip_code = CASE WHEN zip_code = '' THEN NULL ELSE zip_code END
WHERE id IN (
  SELECT DISTINCT c.id
  FROM claimants c 
  JOIN claims cl ON c.id = cl.claimant_id 
  WHERE cl.contact_claims_handler_id = 391 OR cl.adjusters_assistant_id = 391
);
