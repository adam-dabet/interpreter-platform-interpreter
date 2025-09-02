-- Add requested_by field to jobs table
-- This field will reference the customers table to track who requested the job

-- Add the requested_by column
ALTER TABLE jobs ADD COLUMN requested_by_id INTEGER;

-- Add foreign key constraint to customers table
ALTER TABLE jobs ADD CONSTRAINT jobs_requested_by_id_fkey 
    FOREIGN KEY (requested_by_id) REFERENCES customers(id);

-- Add index for better query performance
CREATE INDEX idx_jobs_requested_by ON jobs(requested_by_id);

-- Add comment to document the field
COMMENT ON COLUMN jobs.requested_by_id IS 'Reference to the customer who requested this job';

-- Update existing jobs to set a default requested_by if needed
-- For now, we'll leave it NULL and let admins set it when editing
