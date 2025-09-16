-- Remove facility_confirmation_required field since it's always required
-- Keep only facility_confirmed field to track confirmation status

ALTER TABLE jobs DROP COLUMN IF EXISTS facility_confirmation_required;

-- Drop the index for the removed field
DROP INDEX IF EXISTS idx_jobs_facility_confirmation_required;


