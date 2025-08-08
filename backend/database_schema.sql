-- 1. Create the database (if not exists)
CREATE DATABASE interpreter_platform;
\c interpreter_platform;

-- 2. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For password hashing

-- 3. Create enums first
CREATE TYPE user_role_enum AS ENUM ('customer', 'admin', 'provider', 'agent');
CREATE TYPE application_status_enum AS ENUM (
    'pending_review', 'under_review', 'pending_documents', 'pending_verification',
    'background_check', 'approved', 'rejected', 'withdrawn'
);
CREATE TYPE education_level_enum AS ENUM (
    'high_school', 'associate', 'bachelor', 'master', 'doctorate', 'professional'
);
CREATE TYPE tax_classification_enum AS ENUM (
    'individual', 'sole_proprietorship', 'llc', 'corporation'
);
CREATE TYPE app_document_type_enum AS ENUM (
    'government_id', 'certification', 'diploma', 'transcript', 'w9_form',
    'background_check', 'reference_letter', 'portfolio', 'other'
);
CREATE TYPE proficiency_enum AS ENUM (
    'beginner', 'intermediate', 'advanced', 'native', 'certified_native'
);
CREATE TYPE service_type_enum AS ENUM (
    'medical', 'legal', 'business', 'general', 'emergency'
);
CREATE TYPE verification_enum AS ENUM (
    'pending', 'verified', 'rejected', 'expired', 'suspended'
);
CREATE TYPE email_type_enum AS ENUM (
    'application_received', 'application_approved', 'application_rejected',
    'documents_required', 'verification_complete', 'background_check_required',
    'welcome_approved', 'admin_new_application'
);
CREATE TYPE email_status_enum AS ENUM (
    'pending', 'sending', 'sent', 'delivered', 'failed', 'bounced'
);
CREATE TYPE priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE provider_status_enum AS ENUM (
    'pending', 'approved', 'rejected', 'suspended', 'inactive'
);
CREATE TYPE bg_check_status_enum AS ENUM (
    'pending', 'in_progress', 'passed', 'failed', 'expired'
);

-- 4. Create core tables
-- Users table (foundation)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'provider',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by UUID REFERENCES users(id)
);

-- Languages table
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10), -- ISO language code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certifications reference table
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Translator applications (main registration table)
CREATE TABLE translator_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Application Status
    application_status application_status_enum DEFAULT 'pending_review',
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_started_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    
    -- Address Information
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'US',
    
    -- Professional Information
    business_name VARCHAR(255),
    years_of_experience INTEGER NOT NULL,
    education_level education_level_enum,
    bio TEXT,
    
    -- Service Preferences
    preferred_service_types service_type_enum[] NOT NULL,
    max_travel_distance INTEGER DEFAULT 25,
    willing_to_work_weekends BOOLEAN DEFAULT FALSE,
    willing_to_work_evenings BOOLEAN DEFAULT FALSE,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    emergency_contact_relationship VARCHAR(100) NOT NULL,
    
    -- Tax Information
    ssn_last_four VARCHAR(4) NOT NULL,
    tax_classification tax_classification_enum DEFAULT 'individual',
    
    -- Terms and Agreements
    terms_accepted BOOLEAN DEFAULT FALSE NOT NULL,
    terms_accepted_at TIMESTAMP,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE NOT NULL,
    background_check_consent BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Application Source
    referral_source VARCHAR(100),
    referral_code VARCHAR(20),
    
    -- Background Check Status
    background_check_status bg_check_status_enum DEFAULT 'pending',
    background_check_date TIMESTAMP,
    
    -- Internal Notes
    internal_notes TEXT,
    priority_level priority_enum DEFAULT 'normal',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by UUID REFERENCES users(id)
);

-- Application languages
CREATE TABLE application_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES translator_applications(id) ON DELETE CASCADE,
    language_name VARCHAR(100) NOT NULL,
    proficiency_level proficiency_enum NOT NULL,
    is_native_speaker BOOLEAN DEFAULT FALSE,
    years_of_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application documents
CREATE TABLE application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES translator_applications(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type app_document_type_enum NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Certification Details (if applicable)
    certification_name VARCHAR(255),
    issuing_organization VARCHAR(255),
    certification_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    
    -- Verification Status
    verification_status verification_enum DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- Upload Info
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type email_type_enum NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email queue
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipient Info
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) DEFAULT 'noreply@interpreterplatform.com',
    from_name VARCHAR(255) DEFAULT 'Interpreter Platform',
    
    -- Email Content
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Metadata
    template_name VARCHAR(100),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    
    -- Delivery Status
    status email_status_enum DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Scheduling
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Error Handling
    last_error TEXT,
    priority priority_enum DEFAULT 'normal',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_applications_status ON translator_applications(application_status);
CREATE INDEX idx_applications_email ON translator_applications(email);
CREATE INDEX idx_applications_submission_date ON translator_applications(submission_date);
CREATE INDEX idx_applications_reviewer ON translator_applications(reviewed_by);
CREATE INDEX idx_app_languages_application ON application_languages(application_id);
CREATE INDEX idx_app_docs_application ON application_documents(application_id);
CREATE INDEX idx_app_docs_type ON application_documents(document_type);
CREATE INDEX idx_app_docs_verification ON application_documents(verification_status);
CREATE INDEX idx_email_templates_name ON email_templates(template_name);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_entity ON email_queue(related_entity_type, related_entity_id);

-- Insert default languages
INSERT INTO languages (name, code) VALUES
    ('Spanish', 'es'),
    ('French', 'fr'),
    ('Mandarin', 'zh'),
    ('Portuguese', 'pt'),
    ('Arabic', 'ar'),
    ('Russian', 'ru'),
    ('Japanese', 'ja'),
    ('Korean', 'ko'),
    ('German', 'de'),
    ('Italian', 'it'),
    ('Vietnamese', 'vi'),
    ('Hindi', 'hi'),
    ('Tagalog', 'tl'),
    ('Polish', 'pl'),
    ('Dutch', 'nl');

-- Insert common certifications
INSERT INTO certifications (name, issuing_organization) VALUES
    ('Medical Interpreter Certification', 'National Board of Certification for Medical Interpreters'),
    ('Legal Interpreter License', 'State Court Administration'),
    ('Healthcare Privacy Training', 'HIPAA Training Institute'),
    ('Professional Business Interpreter', 'International Association of Business Interpreters'),
    ('Certified Healthcare Interpreter', 'Certification Commission for Healthcare Interpreters'),
    ('Court Interpreter Certification', 'Administrative Office of Courts'),
    ('Conference Interpreter Certification', 'International Association of Conference Interpreters');

-- Insert email templates
INSERT INTO email_templates (template_name, template_type, subject, body_html, body_text, variables) VALUES
('application_received', 'application_received', 
'Application Received - Welcome to Our Interpreter Network!',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Welcome {{first_name}}!</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Thank you for applying to our interpreter network</p>
</div>
<div style="padding: 30px; background: #f8f9fa;">
    <p style="font-size: 16px; line-height: 1.6;">We have received your interpreter application and our team will review it within <strong>2-3 business days</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        <p style="margin: 0; font-weight: bold; color: #333;">Application Details:</p>
        <p style="margin: 5px 0;"><strong>Application ID:</strong> {{application_id}}</p>
        <p style="margin: 5px 0;"><strong>Submitted:</strong> {{submission_date}}</p>
    </div>
    
    <h3 style="color: #333; margin-top: 30px;">What happens next?</h3>
    <ol style="line-height: 1.8; color: #555;">
        <li>Our team will review your application and documents</li>
        <li>We may contact you if additional information is needed</li>
        <li>Background verification will be conducted</li>
        <li>You will receive approval notification via email</li>
    </ol>
    
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; color: #1976d2;"><strong>💡 Pro Tip:</strong> Make sure to check your email regularly and respond promptly to any requests for additional information to speed up the process.</p>
    </div>
    
    <p style="margin-top: 30px;">Questions? Contact us at <a href="mailto:support@interpreterplatform.com" style="color: #667eea;">support@interpreterplatform.com</a></p>
    
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #666; margin: 0;">Best regards,<br><strong>The Interpreter Platform Team</strong></p>
    </div>
</div>
</body></html>',
'Thank you for your application, {{first_name}}!

We have received your interpreter application and our team will review it within 2-3 business days.

Application ID: {{application_id}}
Submitted: {{submission_date}}

What happens next?
1. Our team will review your application and documents
2. We may contact you if additional information is needed
3. Background verification will be conducted
4. You will receive approval notification via email

Questions? Contact us at support@interpreterplatform.com

Best regards,
The Interpreter Platform Team',
'["first_name", "application_id", "submission_date"]'),

('admin_new_application', 'admin_new_application',
'🆕 New Interpreter Application: {{applicant_name}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="background: #ff6b35; color: white; padding: 20px;">
    <h2 style="margin: 0;">New Interpreter Application Received</h2>
</div>
<div style="padding: 20px; background: #f8f9fa;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p><strong>Applicant:</strong> {{applicant_name}} ({{applicant_email}})</p>
        <p><strong>Application ID:</strong> {{application_id}}</p>
        <p><strong>Service Types:</strong> {{service_types}}</p>
        <p><strong>Languages:</strong> {{languages}}</p>
        <p><strong>Experience:</strong> {{years_experience}} years</p>
    </div>
    <div style="text-align: center;">
        <a href="https://admin.interpreterplatform.com/applications/{{application_id}}" 
           style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
           Review Application →
        </a>
    </div>
</div>
</body></html>',
'New Interpreter Application Received

Applicant: {{applicant_name}} ({{applicant_email}})
Application ID: {{application_id}}
Service Types: {{service_types}}
Languages: {{languages}}
Experience: {{years_experience}} years

Review at: https://admin.interpreterplatform.com/applications/{{application_id}}',
'["applicant_name", "applicant_email", "application_id", "service_types", "languages", "years_experience"]');

-- Create admin user
INSERT INTO users (username, email, password, role, first_name, last_name, is_active, email_verified) 
VALUES ('admin', 'admin@interpreterplatform.com', crypt('admin123', gen_salt('bf')), 'admin', 'Admin', 'User', true, true);