-- Add tracking columns to email_queue table
ALTER TABLE email_queue ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE email_queue ADD COLUMN interpreter_id INTEGER REFERENCES interpreters(id) ON DELETE SET NULL;
ALTER TABLE email_queue ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE email_queue ADD COLUMN reminder_type VARCHAR(50);

-- Add indexes for better performance
CREATE INDEX idx_email_queue_job ON email_queue(job_id);
CREATE INDEX idx_email_queue_interpreter ON email_queue(interpreter_id);
CREATE INDEX idx_email_queue_customer ON email_queue(customer_id);
CREATE INDEX idx_email_queue_reminder_type ON email_queue(reminder_type);

-- Add comments
COMMENT ON COLUMN email_queue.job_id IS 'Associated job ID for tracking';
COMMENT ON COLUMN email_queue.interpreter_id IS 'Associated interpreter ID for tracking';
COMMENT ON COLUMN email_queue.customer_id IS 'Associated customer ID for tracking';
COMMENT ON COLUMN email_queue.reminder_type IS 'Type of reminder (e.g., 2day_reminder, 1day_reminder)';


