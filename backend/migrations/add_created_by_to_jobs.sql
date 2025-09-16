-- Add created_by field to jobs table
ALTER TABLE jobs
ADD COLUMN created_by UUID REFERENCES users(id);

-- Add index for better query performance
CREATE INDEX idx_jobs_created_by ON jobs(created_by);

-- Add comment for documentation
COMMENT ON COLUMN jobs.created_by IS 'ID of the user who created this job';

-- Update existing jobs to have a default created_by value (admin user)
-- First, let's get the admin user ID
UPDATE jobs 
SET created_by = (
    SELECT id FROM users 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE created_by IS NULL;


