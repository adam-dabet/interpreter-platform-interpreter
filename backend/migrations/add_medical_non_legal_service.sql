-- Migration: Add Medical-non legal service type and rename existing medical to Medical-legal
-- This adds a new service type and updates the existing medical service type

-- Update existing medical service type to Medical-legal
UPDATE service_types SET 
    name = 'Medical-legal',
    description = 'Medical interpretation in legal contexts (requires medical certification)',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'medical';

-- Add new Medical-non legal service type
INSERT INTO service_types (code, name, description, is_active, sort_order) 
VALUES ('medical_non_legal', 'Medical- non legal', 'Medical interpretation in non-legal healthcare settings', true, 6)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- Add platform rates for the new Medical-non legal service type
INSERT INTO service_type_rates (service_type_id, rate_amount, rate_unit, minimum_hours, interval_minutes) 
SELECT st.id, 35.00, 'hours', 1.0, 60
FROM service_types st 
WHERE st.code = 'medical_non_legal'
ON CONFLICT (service_type_id) DO UPDATE SET
    rate_amount = 35.00,
    rate_unit = 'hours',
    minimum_hours = 1.0,
    interval_minutes = 60,
    updated_at = CURRENT_TIMESTAMP;
