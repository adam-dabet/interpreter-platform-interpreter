-- Migration: Add provider tables and approval function
-- Run this after the main schema is created

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    billing_address TEXT,
    registration_status provider_status_enum DEFAULT 'pending',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    max_travel_distance_miles INTEGER DEFAULT 25,
    hourly_rate DECIMAL(10,2),
    availability_schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create provider_languages table
CREATE TABLE IF NOT EXISTS provider_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    proficiency_level proficiency_enum NOT NULL,
    is_native_speaker BOOLEAN DEFAULT FALSE,
    years_of_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, language_id)
);

-- Create provider_service_types table
CREATE TABLE IF NOT EXISTS provider_service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_type service_type_enum NOT NULL,
    experience_years INTEGER DEFAULT 0,
    certification_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, service_type)
);

-- Create indexes for provider tables
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(registration_status);
CREATE INDEX IF NOT EXISTS idx_provider_languages_provider ON provider_languages(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_languages_language ON provider_languages(language_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_types_provider ON provider_service_types(provider_id);

-- Function to approve translator application and create provider account
CREATE OR REPLACE FUNCTION approve_translator_application(
    p_application_id UUID,
    p_approved_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    app_record RECORD;
    new_user_id UUID;
    new_provider_id UUID;
    temp_password VARCHAR(12);
    lang_record RECORD;
    lang_id UUID;
    service_type service_type_enum;
BEGIN
    -- Get application details
    SELECT * INTO app_record 
    FROM translator_applications 
    WHERE id = p_application_id AND application_status != 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found or already processed';
    END IF;
    
    -- Generate temporary password
    temp_password := substr(md5(random()::text), 1, 12);
    
    -- Create user account
    INSERT INTO users (
        username, email, password, role, first_name, last_name, phone, is_active, email_verified
    ) VALUES (
        lower(replace(app_record.first_name || '.' || app_record.last_name, ' ', '')),
        app_record.email,
        crypt(temp_password, gen_salt('bf')),
        'provider',
        app_record.first_name,
        app_record.last_name,
        app_record.phone,
        TRUE,
        TRUE
    ) RETURNING id INTO new_user_id;
    
    -- Create provider record
    INSERT INTO providers (
        user_id, business_name, display_name, bio,
        billing_address, registration_status, registration_date,
        approval_date, emergency_contact_name, emergency_contact_phone,
        max_travel_distance_miles
    ) VALUES (
        new_user_id,
        app_record.business_name,
        app_record.first_name || ' ' || app_record.last_name,
        app_record.bio,
        app_record.address_line1 || ', ' || app_record.city || ', ' || app_record.state || ' ' || app_record.zip_code,
        'approved',
        app_record.submission_date,
        CURRENT_TIMESTAMP,
        app_record.emergency_contact_name,
        app_record.emergency_contact_phone,
        app_record.max_travel_distance
    ) RETURNING id INTO new_provider_id;
    
    -- Transfer languages to provider profile
    FOR lang_record IN 
        SELECT * FROM application_languages WHERE application_id = p_application_id
    LOOP
        -- Get or create language ID
        SELECT id INTO lang_id FROM languages WHERE LOWER(name) = LOWER(lang_record.language_name);
        
        IF lang_id IS NULL THEN
            INSERT INTO languages (name) VALUES (lang_record.language_name) RETURNING id INTO lang_id;
        END IF;
        
        -- Insert provider language
        INSERT INTO provider_languages (
            provider_id, language_id, proficiency_level, is_native_speaker, years_of_experience
        ) VALUES (
            new_provider_id, lang_id, lang_record.proficiency_level,
            lang_record.is_native_speaker, lang_record.years_of_experience
        );
    END LOOP;
    
    -- Transfer service types to provider profile
    FOREACH service_type IN ARRAY app_record.preferred_service_types
    LOOP
        INSERT INTO provider_service_types (
            provider_id, service_type, experience_years
        ) VALUES (
            new_provider_id, service_type, app_record.years_of_experience
        );
    END LOOP;
    
    -- Update application status
    UPDATE translator_applications 
    SET 
        application_status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        reviewed_by = p_approved_by,
        internal_notes = COALESCE(internal_notes || E'\n' || p_notes, p_notes)
    WHERE id = p_application_id;
    
    -- TODO: Send approval email to applicant
    -- TODO: Send notification to admin
    
    RETURN new_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at timestamps on provider tables
CREATE TRIGGER update_providers_updated_at 
    BEFORE UPDATE ON providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT EXECUTE ON FUNCTION approve_translator_application(UUID, UUID, TEXT) TO your_app_user; 