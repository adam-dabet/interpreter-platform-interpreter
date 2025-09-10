-- Add facility_phone field to jobs table
-- This field will store the phone number of the facility where the appointment takes place

ALTER TABLE jobs ADD COLUMN facility_phone VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN jobs.facility_phone IS 'Phone number of the facility where the appointment takes place';
