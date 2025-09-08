-- Migration: Update to Comprehensive Status System
-- Date: 2024-12-19
-- Description: Updates job status system to support comprehensive 11-step workflow

-- 1. First, let's see what enum values currently exist
-- Note: This will show current values for reference
-- SELECT enum_range(NULL::job_status_enum);

-- 2. Drop and recreate the job_status_enum with all new values
-- We need to drop it first because PostgreSQL doesn't allow removing enum values
ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);
DROP TYPE IF EXISTS job_status_enum;

-- 3. Create the new comprehensive job_status_enum
CREATE TYPE job_status_enum AS ENUM (
    'requested',              -- 1. Requested by customer
    'approved',               -- 2. Approved by admin
    'finding_interpreter',    -- 3. Finding interpreter (sent to interpreters)
    'assigned',               -- 4. Assigned (interpreter found)
    'reminders_sent',         -- 5. Reminders sent
    'in_progress',            -- 6. In progress (appointment happening)
    'completed',              -- 7. Completed (job complete)
    'completion_report',      -- 8. Completion report (interpreter fills report)
    'billed',                 -- 9. Billed (customer billed)
    'closed',                 -- 10. Closed (job closed)
    'interpreter_paid',       -- 11. Interpreter has been paid
    'cancelled',              -- Job cancelled
    'no_show',                -- No show occurred
    'rejected'                -- Rejected by admin
);

-- 4. Update the jobs table to use the new enum
ALTER TABLE jobs ALTER COLUMN status TYPE job_status_enum USING (
    CASE 
        WHEN status = 'open' THEN 'finding_interpreter'::job_status_enum
        WHEN status = 'pending_authorization' THEN 'requested'::job_status_enum
        WHEN status = 'assigned' THEN 'assigned'::job_status_enum
        WHEN status = 'in_progress' THEN 'in_progress'::job_status_enum
        WHEN status = 'completed' THEN 'completed'::job_status_enum
        WHEN status = 'cancelled' THEN 'cancelled'::job_status_enum
        WHEN status = 'no_show' THEN 'no_show'::job_status_enum
        ELSE 'requested'::job_status_enum  -- Default fallback
    END
);

-- 5. Update default value for new jobs
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'requested';

-- 6. Remove workflow_status column as it's now consolidated into status
-- First backup any important workflow_status data if needed
UPDATE jobs SET admin_notes = COALESCE(admin_notes, '') || 
    CASE 
        WHEN workflow_status IS NOT NULL AND workflow_status != '' 
        THEN '\nPrevious workflow status: ' || workflow_status 
        ELSE '' 
    END
WHERE workflow_status IS NOT NULL AND workflow_status != '';

-- Drop the workflow_status column
ALTER TABLE jobs DROP COLUMN IF EXISTS workflow_status;

-- 7. Add new columns to support the comprehensive workflow
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sent_to_interpreters_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reminders_sent_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_report_data JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billed_amount DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_paid_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interpreter_paid_amount DECIMAL(10,2);

-- 8. Update assignment_status_enum to include expired status
DO $$ BEGIN
    ALTER TYPE assignment_status_enum ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 9. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_interpreter ON jobs(assigned_interpreter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id) WHERE customer_id IS NOT NULL;

-- 10. Create a status transition log table
CREATE TABLE IF NOT EXISTS job_status_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    notes TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_job_id ON job_status_transitions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_transitions_changed_at ON job_status_transitions(changed_at);

-- 11. Create a trigger function to log status changes
CREATE OR REPLACE FUNCTION log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO job_status_transitions (
            job_id, 
            from_status, 
            to_status, 
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status::text,
            NEW.status::text,
            NEW.updated_by,
            'Status changed from ' || COALESCE(OLD.status::text, 'NULL') || ' to ' || NEW.status::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for automatic status change logging
DROP TRIGGER IF EXISTS trigger_log_job_status_change ON jobs;
CREATE TRIGGER trigger_log_job_status_change
    AFTER UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_job_status_change();

-- 13. Add helpful comments for documentation
COMMENT ON TYPE job_status_enum IS 'Comprehensive job status tracking the complete workflow from request to payment';
COMMENT ON TABLE job_status_transitions IS 'Audit log of all job status changes for tracking and reporting';
COMMENT ON COLUMN jobs.status IS 'Current status in the comprehensive 11-step workflow';

-- 14. Update any existing data to have proper status transitions logged
-- Create initial status transition records for existing jobs
INSERT INTO job_status_transitions (job_id, from_status, to_status, changed_at, notes)
SELECT 
    id, 
    NULL, 
    status::text, 
    COALESCE(created_at, CURRENT_TIMESTAMP),
    'Initial status on migration'
FROM jobs 
WHERE NOT EXISTS (
    SELECT 1 FROM job_status_transitions 
    WHERE job_status_transitions.job_id = jobs.id
);

-- 15. Create helper functions for status management
CREATE OR REPLACE FUNCTION get_job_status_history(p_job_id UUID)
RETURNS TABLE (
    status VARCHAR(50),
    changed_at TIMESTAMP,
    changed_by_name VARCHAR(255),
    reason TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jst.to_status,
        jst.changed_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'System') as changed_by_name,
        jst.reason,
        jst.notes
    FROM job_status_transitions jst
    LEFT JOIN users u ON jst.changed_by = u.id
    WHERE jst.job_id = p_job_id
    ORDER BY jst.changed_at ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_transition_job_status(p_from_status VARCHAR(50), p_to_status VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    valid_transitions JSONB := '{
        "requested": ["approved", "rejected"],
        "approved": ["finding_interpreter", "cancelled"],
        "finding_interpreter": ["assigned", "cancelled"],
        "assigned": ["reminders_sent", "in_progress", "cancelled", "no_show"],
        "reminders_sent": ["in_progress", "cancelled", "no_show"],
        "in_progress": ["completed", "cancelled"],
        "completed": ["completion_report", "billed"],
        "completion_report": ["billed"],
        "billed": ["closed", "interpreter_paid"],
        "closed": ["interpreter_paid"],
        "interpreter_paid": [],
        "cancelled": [],
        "no_show": ["billed"],
        "rejected": []
    }';
BEGIN
    RETURN (valid_transitions -> p_from_status) ? p_to_status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_transition_job_status IS 'Validates if a status transition is allowed according to business rules';
COMMENT ON FUNCTION get_job_status_history IS 'Returns the complete status change history for a job';

-- Migration complete
SELECT 'Comprehensive status system migration completed successfully' as result;
