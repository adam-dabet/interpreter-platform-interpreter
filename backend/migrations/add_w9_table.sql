-- Migration: Add W-9 table
-- Date: 2025-08-13

-- Create W-9 table
CREATE TABLE IF NOT EXISTS interpreter_w9_forms (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('individual', 'sole_proprietorship', 'llc', 'corporation')),
    tax_classification VARCHAR(50) NOT NULL CHECK (tax_classification IN ('individual', 'business')),
    ssn VARCHAR(11), -- Format: XXX-XX-XXXX
    ein VARCHAR(10), -- Format: XX-XXXXXXX
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    exempt_payee_code VARCHAR(10),
    exempt_from_fatca BOOLEAN DEFAULT FALSE,
    exempt_from_backup_withholding BOOLEAN DEFAULT FALSE,
    file_path VARCHAR(500), -- Path to uploaded W-9 file
    file_name VARCHAR(255),
    file_size INTEGER, -- File size in bytes
    entry_method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual', 'upload')),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_interpreter_w9_forms_interpreter_id ON interpreter_w9_forms(interpreter_id);
CREATE INDEX idx_interpreter_w9_forms_verification_status ON interpreter_w9_forms(verification_status);
CREATE INDEX idx_interpreter_w9_forms_created_at ON interpreter_w9_forms(created_at);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_w9_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interpreter_w9_forms_updated_at
    BEFORE UPDATE ON interpreter_w9_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_w9_forms_updated_at();

-- Add activity logging trigger
CREATE TRIGGER interpreter_w9_forms_activity_log
    AFTER INSERT OR DELETE OR UPDATE ON interpreter_w9_forms
    FOR EACH ROW
    EXECUTE FUNCTION log_activity_changes();
