-- Migration: Add job timer, completion, and workflow fields
-- Date: 2024-12-19
-- Description: Adds timer functionality, completion tracking, and workflow management to jobs

-- Add timer and completion fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_ended_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_report_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_report_submitted_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_report_data JSONB;

-- Add workflow status fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'assigned';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claimant_reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claimant_reminder_sent_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_authorization_required BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_authorization_obtained BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_authorization_obtained_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_authorization_notes TEXT;

-- Add payment tracking fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_payment_amount DECIMAL(10, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_billing_amount DECIMAL(10, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_billing_status VARCHAR(50) DEFAULT 'pending';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_workflow_status ON jobs(workflow_status);
CREATE INDEX IF NOT EXISTS idx_jobs_completion_report ON jobs(completion_report_submitted);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(interpreter_payment_status, customer_billing_status);

-- Add comments for documentation
COMMENT ON COLUMN jobs.job_started_at IS 'When the interpreter started the job (timer start)';
COMMENT ON COLUMN jobs.job_ended_at IS 'When the interpreter ended the job (timer stop)';
COMMENT ON COLUMN jobs.actual_duration_minutes IS 'Actual time spent on job in minutes';
COMMENT ON COLUMN jobs.completion_report_submitted IS 'Whether completion report has been submitted';
COMMENT ON COLUMN jobs.completion_report_data IS 'JSON data from completion report form';
COMMENT ON COLUMN jobs.workflow_status IS 'Current workflow status: assigned, started, completed, reported, authorized, billed, paid';
COMMENT ON COLUMN jobs.claimant_reminder_sent IS 'Whether reminder was sent to claimant';
COMMENT ON COLUMN jobs.billing_authorization_required IS 'Whether billing authorization is needed';
COMMENT ON COLUMN jobs.billing_authorization_obtained IS 'Whether billing authorization was obtained';
COMMENT ON COLUMN jobs.interpreter_payment_amount IS 'Amount to pay interpreter for this job';
COMMENT ON COLUMN jobs.customer_billing_amount IS 'Amount to bill customer for this job';
