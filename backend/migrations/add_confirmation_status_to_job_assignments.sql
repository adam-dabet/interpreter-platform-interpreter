-- Add confirmation status to job_assignments table
-- This tracks whether an interpreter has confirmed they can still make the appointment after a schedule change

ALTER TABLE job_assignments 
ADD COLUMN confirmation_status VARCHAR(20) DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'declined'));

-- Add confirmation timestamp
ALTER TABLE job_assignments 
ADD COLUMN confirmed_at TIMESTAMP;

-- Add confirmation notes (optional reason for declining)
ALTER TABLE job_assignments 
ADD COLUMN confirmation_notes TEXT;

-- Create index for efficient querying
CREATE INDEX idx_job_assignments_confirmation_status ON job_assignments(confirmation_status);

-- Update existing assignments to have 'confirmed' status if they were accepted before this change
UPDATE job_assignments 
SET confirmation_status = 'confirmed', confirmed_at = created_at 
WHERE status = 'accepted' AND confirmation_status = 'pending';
