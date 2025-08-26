-- Migration: Add second interval rates for two-tier pricing
-- This allows service types like legal to have different rates for first interval vs subsequent intervals

-- Add second interval rate fields to service_type_rates table
ALTER TABLE service_type_rates 
ADD COLUMN IF NOT EXISTS second_interval_rate_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS second_interval_rate_unit VARCHAR(10) CHECK (second_interval_rate_unit IN ('minutes', 'hours')) DEFAULT 'hours';

-- Add second interval rate fields to interpreter_service_rates table
ALTER TABLE interpreter_service_rates 
ADD COLUMN IF NOT EXISTS custom_second_interval_rate_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_second_interval_rate_unit VARCHAR(10) CHECK (custom_second_interval_rate_unit IN ('minutes', 'hours')) DEFAULT 'hours';

-- Update legal service type to have two-tier pricing
-- First 3 hours at $65/hour, then $55/hour for additional hours
UPDATE service_type_rates SET
    second_interval_rate_amount = 55.00,
    second_interval_rate_unit = 'hours',
    updated_at = CURRENT_TIMESTAMP
WHERE service_type_id = 2; -- Legal

-- Add comments for the new fields
COMMENT ON COLUMN service_type_rates.second_interval_rate_amount IS 'Rate for second increment (after minimum hours)';
COMMENT ON COLUMN service_type_rates.second_interval_rate_unit IS 'Rate unit for second increment';
COMMENT ON COLUMN interpreter_service_rates.custom_second_interval_rate_amount IS 'Custom second increment rate set by interpreter';
COMMENT ON COLUMN interpreter_service_rates.custom_second_interval_rate_unit IS 'Custom second increment rate unit set by interpreter';
