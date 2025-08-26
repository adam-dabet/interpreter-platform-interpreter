-- Migration: Create service-type-specific rates system
-- This allows users to set different rates for each service type or agree to platform rates

-- Create service_type_rates table to store platform-set rates
CREATE TABLE IF NOT EXISTS service_type_rates (
    id SERIAL PRIMARY KEY,
    service_type_id INTEGER NOT NULL REFERENCES service_types(id),
    rate_amount DECIMAL(10, 2) NOT NULL,
    rate_unit VARCHAR(10) CHECK (rate_unit IN ('minutes', 'hours')) DEFAULT 'hours',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_type_id)
);

-- Create interpreter_service_rates table to store user's rates for each service type
CREATE TABLE IF NOT EXISTS interpreter_service_rates (
    id SERIAL PRIMARY KEY,
    interpreter_id INTEGER NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
    service_type_id INTEGER NOT NULL REFERENCES service_types(id),
    rate_type VARCHAR(20) CHECK (rate_type IN ('platform', 'custom')) NOT NULL,
    rate_amount DECIMAL(10, 2),
    rate_unit VARCHAR(10) CHECK (rate_unit IN ('minutes', 'hours')) DEFAULT 'hours',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interpreter_id, service_type_id)
);

-- Insert default platform rates for each service type
INSERT INTO service_type_rates (service_type_id, rate_amount, rate_unit) VALUES
(1, 45.00, 'hours'),  -- Medical: $45/hour
(2, 60.00, 'hours'),  -- Legal: $60/hour  
(3, 2.50, 'minutes'), -- Phone: $2.50/minute
(4, 0.15, 'minutes'), -- Document: $0.15/minute
(5, 50.00, 'hours')   -- Other: $50/hour
ON CONFLICT (service_type_id) DO UPDATE SET
    rate_amount = EXCLUDED.rate_amount,
    rate_unit = EXCLUDED.rate_unit,
    updated_at = CURRENT_TIMESTAMP;

-- Add indexes for performance
CREATE INDEX idx_service_type_rates_service_type ON service_type_rates(service_type_id);
CREATE INDEX idx_interpreter_service_rates_interpreter ON interpreter_service_rates(interpreter_id);
CREATE INDEX idx_interpreter_service_rates_service_type ON interpreter_service_rates(service_type_id);

-- Create triggers for updated_at
CREATE TRIGGER update_service_type_rates_updated_at 
    BEFORE UPDATE ON service_type_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interpreter_service_rates_updated_at 
    BEFORE UPDATE ON interpreter_service_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the system
COMMENT ON TABLE service_type_rates IS 'Platform-set default rates for each service type';
COMMENT ON TABLE interpreter_service_rates IS 'User-specific rates for each service type, either platform rates or custom rates';
COMMENT ON COLUMN interpreter_service_rates.rate_type IS 'Whether user agreed to platform rate or set custom rate';
