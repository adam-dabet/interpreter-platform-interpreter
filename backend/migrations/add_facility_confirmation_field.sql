-- Add facility confirmation field to jobs table
-- This field indicates whether we need to confirm with the facility

ALTER TABLE jobs 
ADD COLUMN facility_confirmation_required BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN jobs.facility_confirmation_required IS 'Indicates whether confirmation with the facility is required for this appointment';
