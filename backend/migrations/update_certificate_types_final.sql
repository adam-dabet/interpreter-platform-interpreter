-- Migration: Update certificate types to only include the three specified options
-- This removes unwanted certificate types and updates the remaining ones

-- Deactivate all certificate types first
UPDATE certificate_types SET is_active = false;

-- Update and activate the three required certificate types
UPDATE certificate_types SET 
    name = 'Federal Certification',
    description = 'Federal court interpreter certification',
    is_active = true,
    sort_order = 1
WHERE code = 'federal_certified';

UPDATE certificate_types SET 
    name = 'State Certification',
    description = 'State court interpreter certification - select all states where certified',
    is_active = true,
    sort_order = 2
WHERE code = 'court_certified';

UPDATE certificate_types SET 
    name = 'Administrative Court Certification',
    description = 'Administrative court interpreter certification',
    is_active = true,
    sort_order = 3
WHERE code = 'ata_certified';

-- Insert the new Administrative Court Certification if it doesn't exist
INSERT INTO certificate_types (code, name, description, is_active, sort_order) 
VALUES ('administrative_court_certified', 'Administrative Court Certification', 'Administrative court interpreter certification', true, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- Keep W-9 form as it's needed for tax purposes
UPDATE certificate_types SET 
    is_active = true,
    sort_order = 4
WHERE code = 'w9_form';
