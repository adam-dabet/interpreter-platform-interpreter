-- Create email tracking table to store all sent emails
CREATE TABLE email_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_type VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    interpreter_id INTEGER REFERENCES interpreters(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    reminder_type VARCHAR(50), -- e.g., '2day_reminder', '1day_reminder', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_email_tracking_recipient ON email_tracking(recipient_email);
CREATE INDEX idx_email_tracking_job ON email_tracking(job_id);
CREATE INDEX idx_email_tracking_status ON email_tracking(status);
CREATE INDEX idx_email_tracking_type ON email_tracking(email_type);
CREATE INDEX idx_email_tracking_sent_at ON email_tracking(sent_at);

-- Add comments
COMMENT ON TABLE email_tracking IS 'Tracks all emails sent by the system including reminders, notifications, and confirmations';
COMMENT ON COLUMN email_tracking.email_type IS 'Type of email (e.g., reminder, notification, confirmation)';
COMMENT ON COLUMN email_tracking.status IS 'Email status: pending, sent, delivered, failed, bounced';
COMMENT ON COLUMN email_tracking.reminder_type IS 'Specific reminder type for reminder emails';
