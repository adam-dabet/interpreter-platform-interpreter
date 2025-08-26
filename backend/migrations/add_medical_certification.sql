-- Migration: Add Medical Certification as a fourth certificate type
-- This adds Medical Certification to the existing three certificate types

-- Insert Medical Certification
INSERT INTO certificate_types (code, name, description, is_active, sort_order) 
VALUES ('medical_certified', 'Medical Certification', 'Medical interpreter certification for healthcare settings', true, 4)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- Add comment for the new certificate type
COMMENT ON COLUMN certificate_types.name IS 'Certificate type name - now includes Federal, State, Administrative Court, and Medical certifications';
