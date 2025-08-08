-- Final fix for the parametric system
-- This script handles the type mismatches and creates a working system

-- First, let's drop the problematic tables if they exist and recreate them properly
DROP TABLE IF EXISTS interpreter_certificates CASCADE;
DROP TABLE IF EXISTS interpreter_service_types CASCADE; 
DROP TABLE IF EXISTS interpreter_languages CASCADE;
DROP TABLE IF EXISTS interpreters CASCADE;

-- Now create the interpreters table with proper UUID support
CREATE TABLE interpreters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to users table
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Address fields (US specifications)
    street_address VARCHAR(255),
    street_address_2 VARCHAR(255),
    city VARCHAR(100),
    state_id INTEGER REFERENCES us_states(id),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    
    -- Google Maps integration fields
    formatted_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    place_id VARCHAR(255),
    
    -- Professional information
    years_of_experience INTEGER,
    hourly_rate DECIMAL(10, 2),
    availability_notes TEXT,
    bio TEXT,
    
    -- Status and metadata
    profile_status VARCHAR(50) DEFAULT 'draft',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Verification fields
    background_check_status VARCHAR(50),
    background_check_date DATE,
    verification_status VARCHAR(50) DEFAULT 'pending'
);

-- Interpreter Languages (many-to-many with proficiency levels)
CREATE TABLE interpreter_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interpreter_id UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id),
    proficiency_level VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, language_id)
);

-- Interpreter Service Types (many-to-many)
CREATE TABLE interpreter_service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interpreter_id UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    service_type_id UUID NOT NULL REFERENCES service_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, service_type_id)
);

-- Interpreter Certificates (many-to-many with file storage)
CREATE TABLE interpreter_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interpreter_id UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
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

-- Create indexes
CREATE INDEX idx_interpreters_email ON interpreters (email);
CREATE INDEX idx_interpreters_status ON interpreters (profile_status);
CREATE INDEX idx_interpreters_state ON interpreters (state_id);
CREATE INDEX idx_interpreter_languages_interpreter ON interpreter_languages (interpreter_id);
CREATE INDEX idx_interpreter_languages_language ON interpreter_languages (language_id);
CREATE INDEX idx_interpreter_service_types_interpreter ON interpreter_service_types (interpreter_id);
CREATE INDEX idx_interpreter_service_types_service ON interpreter_service_types (service_type_id);

-- Create triggers (without IF NOT EXISTS which isn't supported for triggers)
DROP TRIGGER IF EXISTS update_interpreters_updated_at ON interpreters;
CREATE TRIGGER update_interpreters_updated_at BEFORE UPDATE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interpreter_certificates_updated_at ON interpreter_certificates;
CREATE TRIGGER update_interpreter_certificates_updated_at BEFORE UPDATE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity log triggers
DROP TRIGGER IF EXISTS interpreters_activity_log ON interpreters;
CREATE TRIGGER interpreters_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

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