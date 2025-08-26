-- Migration: Update certificate and service type names
-- This updates the names to be more specific and consistent

-- Update certificate type names
UPDATE certificate_types SET 
    name = 'State Court Certification',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'court_certified';

UPDATE certificate_types SET 
    name = 'Federal Court Certification',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'federal_certified';

-- Update service type names
UPDATE service_types SET 
    name = 'Medical-Legal',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'medical';

UPDATE service_types SET 
    name = 'Medical-Non Legal',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'medical_non_legal';
