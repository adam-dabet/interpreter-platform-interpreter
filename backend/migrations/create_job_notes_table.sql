-- Migration: Create job notes table
-- Date: 2024-12-19
-- Description: Creates immutable job notes system

-- Create job notes table
CREATE TABLE IF NOT EXISTS job_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, admin, interpreter, claimant, billing
    created_by INTEGER REFERENCES interpreters(id), -- NULL if admin created
    created_by_admin UUID REFERENCES users(id), -- NULL if interpreter created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_immutable BOOLEAN DEFAULT TRUE -- Notes cannot be edited once created
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_job_notes_type ON job_notes(note_type);

-- Add comments for documentation
COMMENT ON TABLE job_notes IS 'Immutable notes for jobs - cannot be edited once created';
COMMENT ON COLUMN job_notes.note_text IS 'The note content';
COMMENT ON COLUMN job_notes.note_type IS 'Type of note: general, admin, interpreter, claimant, billing';
COMMENT ON COLUMN job_notes.created_by IS 'Interpreter ID if interpreter created the note';
COMMENT ON COLUMN job_notes.created_by_admin IS 'Admin user ID if admin created the note';
COMMENT ON COLUMN job_notes.is_immutable IS 'Notes cannot be edited once created';
