-- Add appointment_type to jobs table
ALTER TABLE jobs ADD COLUMN appointment_type VARCHAR(100);

-- Add index for better performance
CREATE INDEX idx_jobs_appointment_type ON jobs(appointment_type);

-- Add comment for documentation
COMMENT ON COLUMN jobs.appointment_type IS 'Original appointment type from frontend (e.g., deposition, acupuncture, etc.)';
