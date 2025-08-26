-- Migration: Update platform rates and add minimum hours and intervals
-- This updates the existing rates and adds new fields for minimum hours and intervals

-- Add new columns to service_type_rates table
ALTER TABLE service_type_rates 
ADD COLUMN IF NOT EXISTS minimum_hours DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS interval_minutes INTEGER DEFAULT 60;

-- Update the platform rates with new values
UPDATE service_type_rates SET
    rate_amount = 40.00,
    minimum_hours = 2.0,
    interval_minutes = 15,
    updated_at = CURRENT_TIMESTAMP
WHERE service_type_id = 1; -- Medical

UPDATE service_type_rates SET
    rate_amount = 65.00,
    minimum_hours = 3.0,
    interval_minutes = 60,
    updated_at = CURRENT_TIMESTAMP
WHERE service_type_id = 2; -- Legal

-- Update other service types with reasonable defaults
UPDATE service_type_rates SET
    rate_amount = 50.00,
    minimum_hours = 1.0,
    interval_minutes = 60,
    updated_at = CURRENT_TIMESTAMP
WHERE service_type_id = 5; -- Other

-- Add new columns to interpreter_service_rates table for custom minimums and intervals
ALTER TABLE interpreter_service_rates 
ADD COLUMN IF NOT EXISTS custom_minimum_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS custom_interval_minutes INTEGER;

-- Add comments for the new fields
COMMENT ON COLUMN service_type_rates.minimum_hours IS 'Minimum hours required for this service type';
COMMENT ON COLUMN service_type_rates.interval_minutes IS 'Billing increments in minutes after minimum hours';
COMMENT ON COLUMN interpreter_service_rates.custom_minimum_hours IS 'Custom minimum hours set by interpreter (overrides platform default)';
COMMENT ON COLUMN interpreter_service_rates.custom_interval_minutes IS 'Custom increments in minutes set by interpreter (overrides platform default)';
