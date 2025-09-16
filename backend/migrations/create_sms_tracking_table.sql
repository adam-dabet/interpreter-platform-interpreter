-- Create SMS tracking table to store all sent SMS messages
CREATE TABLE sms_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sms_type VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    twilio_message_sid VARCHAR(100),
    twilio_status VARCHAR(50),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    interpreter_id INTEGER REFERENCES interpreters(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    reminder_type VARCHAR(50), -- e.g., '2day_reminder', '1day_reminder', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_sms_tracking_recipient ON sms_tracking(recipient_phone);
CREATE INDEX idx_sms_tracking_job ON sms_tracking(job_id);
CREATE INDEX idx_sms_tracking_status ON sms_tracking(status);
CREATE INDEX idx_sms_tracking_type ON sms_tracking(sms_type);
CREATE INDEX idx_sms_tracking_sent_at ON sms_tracking(sent_at);
CREATE INDEX idx_sms_tracking_twilio_sid ON sms_tracking(twilio_message_sid);

-- Add comments
COMMENT ON TABLE sms_tracking IS 'Tracks all SMS messages sent by the system including reminders, notifications, and confirmations';
COMMENT ON COLUMN sms_tracking.sms_type IS 'Type of SMS (e.g., reminder, notification, confirmation)';
COMMENT ON COLUMN sms_tracking.status IS 'SMS status: pending, sent, delivered, failed, undelivered';
COMMENT ON COLUMN sms_tracking.reminder_type IS 'Specific reminder type for reminder SMS';
COMMENT ON COLUMN sms_tracking.twilio_message_sid IS 'Twilio message SID for tracking delivery status';
COMMENT ON COLUMN sms_tracking.twilio_status IS 'Current status from Twilio webhook';


