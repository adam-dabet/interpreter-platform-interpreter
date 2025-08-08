-- Work with existing integer-based interpreters table
-- Update the system to use integer IDs where needed

-- Check if interpreter_languages exists, if not create it with integer interpreter_id
CREATE TABLE IF NOT EXISTS interpreter_languages (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id),
    proficiency_level VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, language_id)
);

-- Check if interpreter_service_types exists, if not create it with integer interpreter_id  
CREATE TABLE IF NOT EXISTS interpreter_service_types (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    service_type_id UUID NOT NULL REFERENCES service_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, service_type_id)
);

-- Check if interpreter_certificates exists, if not create it with integer interpreter_id
CREATE TABLE IF NOT EXISTS interpreter_certificates (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    certificate_type_id UUID NOT NULL REFERENCES certificate_types(id),
    certificate_number VARCHAR(100),
    issuing_organization VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_interpreter_languages_interpreter ON interpreter_languages (interpreter_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_languages_language ON interpreter_languages (language_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_service_types_interpreter ON interpreter_service_types (interpreter_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_service_types_service ON interpreter_service_types (service_type_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_certificates_interpreter ON interpreter_certificates (interpreter_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_certificates_type ON interpreter_certificates (certificate_type_id);

-- Add triggers for the new tables
DROP TRIGGER IF EXISTS update_interpreter_certificates_updated_at ON interpreter_certificates;
CREATE TRIGGER update_interpreter_certificates_updated_at BEFORE UPDATE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS interpreter_languages_activity_log ON interpreter_languages;
CREATE TRIGGER interpreter_languages_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_languages
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

DROP TRIGGER IF EXISTS interpreter_service_types_activity_log ON interpreter_service_types;
CREATE TRIGGER interpreter_service_types_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_service_types
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

DROP TRIGGER IF EXISTS interpreter_certificates_activity_log ON interpreter_certificates;
CREATE TRIGGER interpreter_certificates_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();