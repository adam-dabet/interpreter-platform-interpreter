-- Migration: Remove 'Non-Certified Interpreter' from interpreter types
-- This deactivates the non_certified interpreter type as requested

-- Deactivate the non_certified interpreter type
UPDATE interpreter_types 
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE code = 'non_certified';

-- Add a comment to document this change
COMMENT ON TABLE interpreter_types IS 'Interpreter types table - non_certified type has been deactivated per business requirements';
