-- Migration: Add job authorization fields
-- Date: 2024-12-19
-- Description: Adds fields to track job authorization by admins

-- Add authorization fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS authorized_by UUID REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for authorization queries
CREATE INDEX IF NOT EXISTS idx_jobs_authorized_by ON jobs(authorized_by);
CREATE INDEX IF NOT EXISTS idx_jobs_authorized_at ON jobs(authorized_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Add comments for documentation
COMMENT ON COLUMN jobs.authorized_by IS 'Admin user who authorized this job';
COMMENT ON COLUMN jobs.authorized_at IS 'Timestamp when job was authorized';
COMMENT ON COLUMN jobs.rejection_reason IS 'Reason for job rejection if applicable';

-- Update existing jobs with 'open' status to have authorized_at timestamp
UPDATE jobs 
SET authorized_at = created_at 
WHERE status = 'open' AND authorized_at IS NULL;


