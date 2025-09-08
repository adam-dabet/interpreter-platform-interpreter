-- Migration: Remove 'approved' status from job workflow (Version 2)
-- Date: 2025-09-08
-- Description: Removes 'approved' status so jobs go directly from 'requested' to 'finding_interpreter'

-- 1. Update any jobs with 'approved' status to 'finding_interpreter'
UPDATE jobs 
SET status = 'finding_interpreter' 
WHERE status = 'approved';

-- 2. Drop the views that depend on the status column
DROP VIEW IF EXISTS available_jobs CASCADE;
DROP VIEW IF EXISTS interpreter_jobs CASCADE;

-- 3. Drop and recreate the job_status_enum without 'approved'
ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);
DROP TYPE IF EXISTS job_status_enum CASCADE;

-- 4. Create the new job_status_enum without 'approved'
CREATE TYPE job_status_enum AS ENUM (
    'requested',              -- 1. Requested by customer
    'finding_interpreter',    -- 2. Finding interpreter (sent to interpreters)
    'assigned',               -- 3. Assigned (interpreter found)
    'reminders_sent',         -- 4. Reminders sent
    'in_progress',            -- 5. In progress (appointment happening)
    'completed',              -- 6. Completed (job complete)
    'completion_report',      -- 7. Completion report (interpreter fills report)
    'billed',                 -- 8. Billed (customer billed)
    'closed',                 -- 9. Closed (job closed)
    'interpreter_paid',       -- 10. Interpreter has been paid
    'cancelled',              -- Job cancelled
    'no_show',                -- No show occurred
    'rejected'                -- Rejected by admin
);

-- 5. Update the jobs table to use the new enum
ALTER TABLE jobs ALTER COLUMN status TYPE job_status_enum USING status::job_status_enum;

-- 6. Update default value for new jobs
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'requested';

-- 7. Recreate the available_jobs view with updated status filter
CREATE VIEW available_jobs AS
SELECT j.id,
    j.title,
    j.description,
    j.job_type,
    j.priority,
    j.status,
    j.location_address,
    j.location_city,
    j.location_state,
    j.location_zip_code,
    j.latitude,
    j.longitude,
    j.is_remote,
    j.scheduled_date,
    j.scheduled_time,
    j.estimated_duration_minutes,
    j.actual_duration_minutes,
    j.source_language_id,
    j.target_language_id,
    j.service_type_id,
    j.hourly_rate,
    j.total_amount,
    j.payment_status,
    j.client_name,
    j.client_email,
    j.client_phone,
    j.client_notes,
    j.assigned_interpreter_id,
    j.assigned_at,
    j.completed_at,
    j.created_by,
    j.created_at,
    j.updated_at,
    j.updated_by,
    j.special_requirements,
    j.cancellation_reason,
    j.admin_notes,
    l1.name AS source_language_name,
    l2.name AS target_language_name,
    st.name AS service_type_name,
    (u.first_name::text || ' '::text) || u.last_name::text AS created_by_name
FROM jobs j
    LEFT JOIN languages l1 ON j.source_language_id = l1.id
    LEFT JOIN languages l2 ON j.target_language_id = l2.id
    LEFT JOIN service_types st ON j.service_type_id = st.id
    LEFT JOIN users u ON j.created_by = u.id
WHERE j.status = 'finding_interpreter'::job_status_enum 
    AND j.scheduled_date >= CURRENT_DATE
    AND j.is_active = true
ORDER BY j.priority DESC, j.scheduled_date, j.scheduled_time;
