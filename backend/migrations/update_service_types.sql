-- Update service types to only include the five requested types
-- This migration will deactivate all existing service types and create new ones

-- First, deactivate all existing service types
UPDATE service_types SET is_active = false;

-- Insert the new service types
INSERT INTO service_types (code, name, description, is_active, sort_order) VALUES
('medical', 'Medical', 'Hospitals, clinics, medical appointments', true, 1),
('legal', 'Legal', 'Courts, law offices, legal consultations', true, 2),
('phone', 'Phone', 'Remote interpretation via phone', true, 3),
('document', 'Document', 'Written document translation services', true, 4),
('other', 'Other', 'Other interpretation services', true, 5)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP; 