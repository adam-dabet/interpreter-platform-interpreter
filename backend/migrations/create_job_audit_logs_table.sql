-- Create job audit logs table for tracking appointment changes
CREATE TABLE IF NOT EXISTS job_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'customer_edit', 'admin_edit', 'status_change', etc.
    changed_by UUID, -- Customer ID or Admin ID
    changed_by_type VARCHAR(20) NOT NULL, -- 'customer', 'admin', 'system'
    changes JSONB NOT NULL, -- Array of field changes with old/new values
    notes TEXT, -- Additional notes about the change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_job_id ON job_audit_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_action ON job_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_changed_by ON job_audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_created_at ON job_audit_logs(created_at);

-- Add comment
COMMENT ON TABLE job_audit_logs IS 'Audit trail for job/appointment changes';
COMMENT ON COLUMN job_audit_logs.changes IS 'JSON array of field changes: [{"field": "title", "oldValue": "Old Title", "newValue": "New Title"}]';
COMMENT ON COLUMN job_audit_logs.changed_by_type IS 'Type of user who made the change: customer, admin, or system';
