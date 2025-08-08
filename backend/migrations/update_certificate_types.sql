-- Update certificate types to remove background check and add W9 form
-- This migration will deactivate the background check certificate type and add W9 form

-- First, deactivate the background check certificate type
UPDATE certificate_types SET is_active = false WHERE code = 'background_check';

-- Insert the new W9 form certificate type
INSERT INTO certificate_types (code, name, description, is_required, sort_order) VALUES
('w9_form', 'W-9 Tax Form', 'IRS Form W-9 for tax identification', true, 1)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- Update sort order for other required certificates
UPDATE certificate_types SET sort_order = 2 WHERE code = 'court_certified';
UPDATE certificate_types SET sort_order = 3 WHERE code = 'language_proficiency'; 