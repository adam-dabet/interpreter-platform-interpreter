-- Create job_magic_links table for secure job timing access
CREATE TABLE IF NOT EXISTS job_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_for_start BOOLEAN DEFAULT FALSE,
    used_for_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_job_magic_links_token ON job_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_job_magic_links_job_id ON job_magic_links(job_id);
CREATE INDEX IF NOT EXISTS idx_job_magic_links_expires_at ON job_magic_links(expires_at);

-- Add job timing fields to jobs table if they don't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS job_ended_at TIMESTAMP WITH TIME ZONE;

-- Drop function if it exists, then create function to clean up expired magic links
DROP FUNCTION IF EXISTS cleanup_expired_magic_links();
CREATE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
    DELETE FROM job_magic_links 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_magic_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_magic_links_updated_at
    BEFORE UPDATE ON job_magic_links
    FOR EACH ROW
    EXECUTE FUNCTION update_job_magic_links_updated_at();
