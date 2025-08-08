-- Create parametric system with comprehensive logging
-- Run this migration after the existing schema

-- Languages table (parametric)
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- ISO 639-1 or custom codes
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- Service Types table (parametric)
CREATE TABLE IF NOT EXISTS service_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- Certificate Types table (parametric)
CREATE TABLE IF NOT EXISTS certificate_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- US States table for address validation
CREATE TABLE IF NOT EXISTS us_states (
    id SERIAL PRIMARY KEY,
    code CHAR(2) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Interpreters table (comprehensive profile)
CREATE TABLE IF NOT EXISTS interpreters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE, -- Reference to users table if exists
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
    profile_status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected, suspended
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    
    -- Verification fields
    background_check_status VARCHAR(50),
    background_check_date DATE,
    verification_status VARCHAR(50) DEFAULT 'pending'
);

-- Interpreter Languages (many-to-many with proficiency levels)
CREATE TABLE IF NOT EXISTS interpreter_languages (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    language_id INTEGER NOT NULL REFERENCES languages(id),
    proficiency_level VARCHAR(50) NOT NULL, -- native, fluent, conversational, basic
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, language_id)
);

-- Interpreter Service Types (many-to-many)
CREATE TABLE IF NOT EXISTS interpreter_service_types (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    service_type_id INTEGER NOT NULL REFERENCES service_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, service_type_id)
);

-- Interpreter Certificates (many-to-many with file storage)
CREATE TABLE IF NOT EXISTS interpreter_certificates (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    certificate_type_id INTEGER NOT NULL REFERENCES certificate_types(id),
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

-- Comprehensive logging table
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARN, ERROR, FATAL
    category VARCHAR(50) NOT NULL, -- AUTH, API, DATABASE, VALIDATION, etc.
    message TEXT NOT NULL,
    details JSONB,
    
    -- Context information
    user_id INTEGER,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Location information
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER, -- in milliseconds
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    -- Indexing for performance
    INDEX idx_system_logs_level (log_level),
    INDEX idx_system_logs_category (category),
    INDEX idx_system_logs_created_at (created_at),
    INDEX idx_system_logs_user_id (user_id)
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activity_logs_table_record (table_name, record_id),
    INDEX idx_activity_logs_user_id (user_id),
    INDEX idx_activity_logs_created_at (created_at)
);

-- Insert default US states
INSERT INTO us_states (code, name) VALUES
('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia');

-- Insert sample languages
INSERT INTO languages (code, name, native_name) VALUES
('en', 'English', 'English'),
('es', 'Spanish', 'Español'),
('fr', 'French', 'Français'),
('de', 'German', 'Deutsch'),
('it', 'Italian', 'Italiano'),
('pt', 'Portuguese', 'Português'),
('ru', 'Russian', 'Русский'),
('zh', 'Chinese', '中文'),
('ja', 'Japanese', '日本語'),
('ko', 'Korean', '한국어'),
('ar', 'Arabic', 'العربية'),
('hi', 'Hindi', 'हिन्दी'),
('th', 'Thai', 'ไทย'),
('vi', 'Vietnamese', 'Tiếng Việt'),
('pl', 'Polish', 'Polski'),
('nl', 'Dutch', 'Nederlands'),
('sv', 'Swedish', 'Svenska'),
('no', 'Norwegian', 'Norsk'),
('da', 'Danish', 'Dansk'),
('fi', 'Finnish', 'Suomi');

-- Insert sample service types
INSERT INTO service_types (code, name, description) VALUES
('medical', 'Medical Interpretation', 'Healthcare and medical appointments'),
('legal', 'Legal Interpretation', 'Court proceedings and legal consultations'),
('business', 'Business Interpretation', 'Corporate meetings and negotiations'),
('conference', 'Conference Interpretation', 'Large events and conferences'),
('community', 'Community Interpretation', 'Social services and community events'),
('educational', 'Educational Interpretation', 'Schools and educational institutions'),
('government', 'Government Interpretation', 'Government agencies and services'),
('mental_health', 'Mental Health Interpretation', 'Psychology and psychiatry sessions'),
('immigration', 'Immigration Interpretation', 'Immigration services and proceedings'),
('telephone', 'Telephone Interpretation', 'Remote interpretation via phone'),
('video', 'Video Remote Interpretation', 'Remote interpretation via video call'),
('document', 'Document Translation', 'Written document translation services');

-- Insert sample certificate types
INSERT INTO certificate_types (code, name, description, is_required) VALUES
('court_certified', 'Court Certified Interpreter', 'State court certification', true),
('medical_certified', 'Medical Interpreter Certification', 'Healthcare interpretation certification', false),
('ata_certified', 'ATA Certification', 'American Translators Association certification', false),
('chi_certified', 'CHI Certification', 'Certification Commission for Healthcare Interpreters', false),
('nbcmi_certified', 'NBCMI Certification', 'National Board of Certification for Medical Interpreters', false),
('federal_certified', 'Federal Court Certification', 'Federal court interpreter certification', false),
('language_proficiency', 'Language Proficiency Certificate', 'Official language proficiency documentation', true),
('background_check', 'Background Check', 'Criminal background check clearance', true),
('business_license', 'Business License', 'Professional business license', false),
('insurance', 'Professional Liability Insurance', 'Professional liability insurance certificate', false);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_types_updated_at BEFORE UPDATE ON certificate_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interpreters_updated_at BEFORE UPDATE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interpreter_certificates_updated_at BEFORE UPDATE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log activity changes
CREATE OR REPLACE FUNCTION log_activity_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    field_name TEXT;
BEGIN
    -- Convert OLD and NEW to JSONB
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Find changed fields
        FOR field_name IN SELECT key FROM jsonb_each(old_data)
        LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert activity log
    INSERT INTO activity_logs (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        changed_fields,
        user_id,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        COALESCE(NEW.updated_by, NEW.created_by, OLD.updated_by, OLD.created_by),
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create activity log triggers for main tables
CREATE TRIGGER interpreters_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER interpreter_languages_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_languages
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER interpreter_service_types_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_service_types
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER interpreter_certificates_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();