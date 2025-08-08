-- Fix parametric system migration to work with existing UUID-based schema
-- This script will work with the existing database structure

-- First, let's add the missing native_name column to existing languages table
ALTER TABLE languages ADD COLUMN IF NOT EXISTS native_name VARCHAR(100);
ALTER TABLE languages ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing languages with native names
UPDATE languages SET native_name = name WHERE native_name IS NULL;

-- Service Types table (using UUID to match existing pattern)
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Certificate Types table (using UUID to match existing pattern)
CREATE TABLE IF NOT EXISTS certificate_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- US States table
CREATE TABLE IF NOT EXISTS us_states (
    id SERIAL PRIMARY KEY,
    code CHAR(2) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Interpreters table (comprehensive profile)
CREATE TABLE IF NOT EXISTS interpreters (
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
    profile_status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected, suspended
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

-- Interpreter Languages (many-to-many with proficiency levels) - Using UUID for language_id
CREATE TABLE IF NOT EXISTS interpreter_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interpreter_id UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id),
    proficiency_level VARCHAR(50) NOT NULL, -- native, fluent, conversational, basic
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, language_id)
);

-- Interpreter Service Types (many-to-many) - Using UUID for service_type_id
CREATE TABLE IF NOT EXISTS interpreter_service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interpreter_id UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    service_type_id UUID NOT NULL REFERENCES service_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, service_type_id)
);

-- Interpreter Certificates (many-to-many with file storage) - Using UUID for certificate_type_id
CREATE TABLE IF NOT EXISTS interpreter_certificates (
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

-- Comprehensive logging table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARN, ERROR, FATAL
    category VARCHAR(50) NOT NULL, -- AUTH, API, DATABASE, VALIDATION, etc.
    message TEXT NOT NULL,
    details JSONB,
    
    -- Context information
    user_id UUID,
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
    created_by UUID
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (proper PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs (log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs (category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_table_record ON activity_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_interpreters_email ON interpreters (email);
CREATE INDEX IF NOT EXISTS idx_interpreters_status ON interpreters (profile_status);
CREATE INDEX IF NOT EXISTS idx_interpreters_state ON interpreters (state_id);

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
('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia')
ON CONFLICT (code) DO NOTHING;

-- Update existing languages with additional data (only if they don't already exist)
UPDATE languages SET 
    native_name = CASE 
        WHEN code = 'es' THEN 'Español'
        WHEN code = 'fr' THEN 'Français'
        WHEN code = 'de' THEN 'Deutsch'
        WHEN code = 'it' THEN 'Italiano'
        WHEN code = 'pt' THEN 'Português'
        WHEN code = 'ru' THEN 'Русский'
        WHEN code = 'zh' THEN '中文'
        WHEN code = 'ja' THEN '日本語'
        WHEN code = 'ko' THEN '한국어'
        WHEN code = 'ar' THEN 'العربية'
        WHEN code = 'hi' THEN 'हिन्दी'
        WHEN code = 'vi' THEN 'Tiếng Việt'
        WHEN code = 'pl' THEN 'Polski'
        WHEN code = 'nl' THEN 'Nederlands'
        ELSE name
    END
WHERE native_name = name OR native_name IS NULL;

-- Insert additional languages if they don't exist
INSERT INTO languages (name, code, native_name, is_active) VALUES
('English', 'en', 'English', true),
('Thai', 'th', 'ไทย', true),
('Swedish', 'sv', 'Svenska', true),
('Norwegian', 'no', 'Norsk', true),
('Danish', 'da', 'Dansk', true),
('Finnish', 'fi', 'Suomi', true)
ON CONFLICT (name) DO NOTHING;

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
('document', 'Document Translation', 'Written document translation services')
ON CONFLICT (code) DO NOTHING;

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
('insurance', 'Professional Liability Insurance', 'Professional liability insurance certificate', false)
ON CONFLICT (code) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that have updated_at columns
CREATE TRIGGER IF NOT EXISTS update_service_types_updated_at BEFORE UPDATE ON service_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_certificate_types_updated_at BEFORE UPDATE ON certificate_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_interpreters_updated_at BEFORE UPDATE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_interpreter_certificates_updated_at BEFORE UPDATE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log activity changes
CREATE OR REPLACE FUNCTION log_activity_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    field_name TEXT;
    record_id_val UUID;
BEGIN
    -- Get the record ID (works for both UUID and other types)
    IF TG_OP = 'DELETE' THEN
        record_id_val := OLD.id;
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        record_id_val := NEW.id;
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        record_id_val := NEW.id;
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
        record_id_val,
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
CREATE TRIGGER IF NOT EXISTS interpreters_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreters
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER IF NOT EXISTS interpreter_languages_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_languages
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER IF NOT EXISTS interpreter_service_types_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_service_types
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();

CREATE TRIGGER IF NOT EXISTS interpreter_certificates_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON interpreter_certificates
    FOR EACH ROW EXECUTE FUNCTION log_activity_changes();