-- Add interpreter_type_id to jobs table
ALTER TABLE jobs ADD COLUMN interpreter_type_id UUID REFERENCES interpreter_types(id);

-- Add index for better performance
CREATE INDEX idx_jobs_interpreter_type ON jobs(interpreter_type_id);

-- Add comment for documentation
COMMENT ON COLUMN jobs.interpreter_type_id IS 'Required interpreter type for this job (e.g., Court Certified, Medical Certified, etc.)';
