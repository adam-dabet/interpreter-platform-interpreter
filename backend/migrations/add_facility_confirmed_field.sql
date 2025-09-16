-- Add facility_confirmed field to jobs table
-- This field tracks whether facility confirmation has been completed

ALTER TABLE jobs 
ADD COLUMN facility_confirmed BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN jobs.facility_confirmed IS 'Indicates whether facility confirmation has been completed for this appointment';

-- Create index for better query performance
CREATE INDEX idx_jobs_facility_confirmed ON jobs(facility_confirmed);

-- Update existing jobs that require confirmation to be unconfirmed by default
UPDATE jobs 
SET facility_confirmed = FALSE 
WHERE facility_confirmation_required = TRUE;