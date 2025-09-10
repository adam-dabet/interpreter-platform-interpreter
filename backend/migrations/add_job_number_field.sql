-- Add job_number field to jobs table
-- This field will store unique job numbers like JOB-000001, JOB-000002, etc.

ALTER TABLE jobs ADD COLUMN job_number VARCHAR(20) UNIQUE;

-- Add comment for documentation
COMMENT ON COLUMN jobs.job_number IS 'Unique job number in format JOB-XXXXXX';

-- Create index for faster lookups
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
