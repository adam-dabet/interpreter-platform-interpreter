-- Job Management System Migration (Fixed)
-- This migration adds tables for managing interpretation jobs and assignments

-- 1. Create job-related enums (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE job_status_enum AS ENUM (
        'open', 'assigned', 'in_progress', 'completed', 'cancelled', 'no_show'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_priority_enum AS ENUM (
        'low', 'normal', 'high', 'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_type_enum AS ENUM (
        'medical', 'legal', 'business', 'education', 'social_services', 'emergency', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assignment_status_enum AS ENUM (
        'pending', 'accepted', 'declined', 'completed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    job_type job_type_enum NOT NULL DEFAULT 'other',
    priority job_priority_enum NOT NULL DEFAULT 'normal',
    status job_status_enum NOT NULL DEFAULT 'open',
    
    -- Location and Timing
    location_address TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_zip_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_remote BOOLEAN DEFAULT FALSE,
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 60,
    actual_duration_minutes INTEGER,
    
    -- Language Requirements
    source_language_id UUID REFERENCES languages(id),
    target_language_id UUID REFERENCES languages(id),
    
    -- Service Requirements
    service_type_id INTEGER REFERENCES service_types(id),
    
    -- Financial Information
    hourly_rate DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Client Information
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(20),
    client_notes TEXT,
    
    -- Assignment Information
    assigned_interpreter_id INTEGER REFERENCES interpreters(id),
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Admin Information
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    
    -- Additional Fields
    special_requirements TEXT,
    cancellation_reason TEXT,
    admin_notes TEXT
);

-- 3. Create job assignments table (for tracking interpreter responses)
CREATE TABLE IF NOT EXISTS job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    
    -- Assignment Details
    status assignment_status_enum NOT NULL DEFAULT 'pending',
    response_time TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    declined_reason TEXT,
    
    -- Financial Details
    agreed_rate DECIMAL(10, 2),
    actual_hours DECIMAL(5, 2),
    total_payment DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one assignment per job per interpreter
    UNIQUE(job_id, interpreter_id)
);

-- 4. Create job notifications table (for tracking notifications sent to interpreters)
CREATE TABLE IF NOT EXISTS job_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- 'job_available', 'reminder', 'cancellation', etc.
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    
    -- Content
    subject VARCHAR(255),
    message TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'sent' -- 'sent', 'delivered', 'failed', 'read'
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_jobs_languages ON jobs(source_language_id, target_language_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_type ON jobs(service_type_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_interpreter ON jobs(assigned_interpreter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_interpreter_id ON job_assignments(interpreter_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON job_assignments(status);

CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id ON job_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_interpreter_id ON job_notifications(interpreter_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_sent_at ON job_notifications(sent_at);

-- 6. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_assignments_updated_at ON job_assignments;
CREATE TRIGGER update_job_assignments_updated_at 
    BEFORE UPDATE ON job_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create activity log function for job events
CREATE OR REPLACE FUNCTION log_job_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        COALESCE(NEW.created_by, OLD.created_by),
        CURRENT_TIMESTAMP
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add activity log triggers
DROP TRIGGER IF EXISTS jobs_activity_log ON jobs;
CREATE TRIGGER jobs_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON jobs
    FOR EACH ROW EXECUTE FUNCTION log_job_activity();

DROP TRIGGER IF EXISTS job_assignments_activity_log ON job_assignments;
CREATE TRIGGER job_assignments_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON job_assignments
    FOR EACH ROW EXECUTE FUNCTION log_job_activity();

-- 8. Insert some sample data for testing
INSERT INTO jobs (
    title, 
    description, 
    job_type, 
    priority, 
    scheduled_date, 
    scheduled_time, 
    estimated_duration_minutes,
    location_city,
    location_state,
    is_remote,
    source_language_id,
    target_language_id,
    service_type_id,
    hourly_rate,
    total_amount,
    client_name,
    client_email,
    created_by
) VALUES 
(
    'Medical Appointment - Spanish Interpreter Needed',
    'Patient needs Spanish interpreter for routine medical checkup. Patient speaks limited English.',
    'medical',
    'normal',
    CURRENT_DATE + INTERVAL '2 days',
    '10:00:00',
    60,
    'Los Angeles',
    'CA',
    FALSE,
    (SELECT id FROM languages WHERE code = 'es' LIMIT 1),
    (SELECT id FROM languages WHERE code = 'en' LIMIT 1),
    (SELECT id FROM service_types WHERE code = 'medical' LIMIT 1),
    35.00,
    35.00,
    'Dr. Smith Medical Clinic',
    'clinic@example.com',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
),
(
    'Legal Consultation - Mandarin Interpreter',
    'Attorney needs Mandarin interpreter for client consultation regarding immigration case.',
    'legal',
    'high',
    CURRENT_DATE + INTERVAL '1 day',
    '14:30:00',
    90,
    'San Francisco',
    'CA',
    FALSE,
    (SELECT id FROM languages WHERE code = 'zh' LIMIT 1),
    (SELECT id FROM languages WHERE code = 'en' LIMIT 1),
    (SELECT id FROM service_types WHERE code = 'legal' LIMIT 1),
    40.00,
    60.00,
    'Law Office of Johnson & Associates',
    'lawyer@example.com',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
),
(
    'Business Meeting - French Interpreter',
    'International business meeting requiring French interpreter for contract negotiations.',
    'business',
    'normal',
    CURRENT_DATE + INTERVAL '3 days',
    '09:00:00',
    120,
    'New York',
    'NY',
    TRUE,
    (SELECT id FROM languages WHERE code = 'fr' LIMIT 1),
    (SELECT id FROM languages WHERE code = 'en' LIMIT 1),
    (SELECT id FROM service_types WHERE code = 'business' LIMIT 1),
    45.00,
    90.00,
    'Global Tech Solutions',
    'meetings@globaltech.com',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- 9. Create a view for available jobs (jobs that are open and not assigned)
CREATE OR REPLACE VIEW available_jobs AS
SELECT 
    j.*,
    l1.name as source_language_name,
    l2.name as target_language_name,
    st.name as service_type_name,
    u.first_name || ' ' || u.last_name as created_by_name
FROM jobs j
LEFT JOIN languages l1 ON j.source_language_id = l1.id
LEFT JOIN languages l2 ON j.target_language_id = l2.id
LEFT JOIN service_types st ON j.service_type_id = st.id
LEFT JOIN users u ON j.created_by = u.id
WHERE j.status = 'open' 
AND j.scheduled_date >= CURRENT_DATE
ORDER BY j.priority DESC, j.scheduled_date ASC, j.scheduled_time ASC;

-- 10. Create a view for interpreter dashboard (jobs assigned to specific interpreter)
CREATE OR REPLACE VIEW interpreter_jobs AS
SELECT 
    j.*,
    ja.status as assignment_status,
    ja.agreed_rate,
    ja.actual_hours,
    ja.total_payment,
    l1.name as source_language_name,
    l2.name as target_language_name,
    st.name as service_type_name
FROM jobs j
LEFT JOIN job_assignments ja ON j.id = ja.job_id
LEFT JOIN languages l1 ON j.source_language_id = l1.id
LEFT JOIN languages l2 ON j.target_language_id = l2.id
LEFT JOIN service_types st ON j.service_type_id = st.id
WHERE ja.interpreter_id IS NOT NULL
ORDER BY j.scheduled_date ASC, j.scheduled_time ASC;

COMMENT ON TABLE jobs IS 'Main table for interpretation job postings';
COMMENT ON TABLE job_assignments IS 'Tracks interpreter responses and assignments to jobs';
COMMENT ON TABLE job_notifications IS 'Tracks notifications sent to interpreters about available jobs';
COMMENT ON VIEW available_jobs IS 'View of all open jobs available for assignment';
COMMENT ON VIEW interpreter_jobs IS 'View of jobs assigned to specific interpreters';


