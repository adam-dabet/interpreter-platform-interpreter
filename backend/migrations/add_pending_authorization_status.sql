-- Migration: Add pending_authorization status to job_status_enum
-- Date: 2024-12-19
-- Description: Adds pending_authorization status for jobs that need admin approval

-- Add pending_authorization to the job_status_enum
ALTER TYPE job_status_enum ADD VALUE IF NOT EXISTS 'pending_authorization';

-- Add comment for documentation
COMMENT ON TYPE job_status_enum IS 'Status of a job: open, assigned, in_progress, completed, cancelled, no_show, pending_authorization';

