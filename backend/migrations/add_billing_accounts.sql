-- Migration: Add billing accounts and their rate structures
-- This allows managing different billing accounts with their own rate configurations

-- Create billing_accounts table
CREATE TABLE IF NOT EXISTS billing_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id)
);

-- Create billing_account_rates table to store rate structures
CREATE TABLE IF NOT EXISTS billing_account_rates (
    id SERIAL PRIMARY KEY,
    billing_account_id INTEGER NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
    service_category VARCHAR(50) NOT NULL, -- 'general', 'legal', 'medical_certified', 'psychological', 'routine_visits'
    rate_type VARCHAR(10) NOT NULL, -- 'A' or 'B'
    rate_amount DECIMAL(10, 2) NOT NULL,
    time_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(billing_account_id, service_category, rate_type)
);

-- Add indexes for performance
CREATE INDEX idx_billing_accounts_name ON billing_accounts(name);
CREATE INDEX idx_billing_accounts_email ON billing_accounts(email);
CREATE INDEX idx_billing_accounts_is_active ON billing_accounts(is_active);
CREATE INDEX idx_billing_account_rates_account ON billing_account_rates(billing_account_id);
CREATE INDEX idx_billing_account_rates_category ON billing_account_rates(service_category);

-- Create triggers for updated_at
CREATE TRIGGER update_billing_accounts_updated_at 
    BEFORE UPDATE ON billing_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_account_rates_updated_at 
    BEFORE UPDATE ON billing_account_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE billing_accounts IS 'Billing accounts for different clients/organizations';
COMMENT ON TABLE billing_account_rates IS 'Rate structures for each billing account by service category';
COMMENT ON COLUMN billing_account_rates.service_category IS 'Service category: general, legal, medical_certified, psychological, routine_visits';
COMMENT ON COLUMN billing_account_rates.rate_type IS 'Rate type: A (higher tier) or B (lower tier)';
COMMENT ON COLUMN billing_account_rates.rate_amount IS 'Rate amount in dollars';
COMMENT ON COLUMN billing_account_rates.time_minutes IS 'Time duration in minutes';

-- Insert sample billing account
INSERT INTO billing_accounts (name, phone, email) VALUES
('Default Billing Account', '(555) 123-4567', 'billing@example.com')
ON CONFLICT DO NOTHING;

-- Insert sample rates for the default billing account (based on the image)
INSERT INTO billing_account_rates (billing_account_id, service_category, rate_type, rate_amount, time_minutes) VALUES
-- General Rates
(1, 'general', 'A', 140.00, 120),
(1, 'general', 'B', 70.00, 60),

-- Legal Rates
(1, 'legal', 'A', 330.00, 180),
(1, 'legal', 'B', 330.00, 180),

-- Medical Certified Rates
(1, 'medical_certified', 'A', 200.00, 120),
(1, 'medical_certified', 'B', 100.00, 60),

-- Psychological Rates
(1, 'psychological', 'A', 200.00, 120),
(1, 'psychological', 'B', 100.00, 60),

-- Routine Visits Rates
(1, 'routine_visits', 'A', 140.00, 120),
(1, 'routine_visits', 'B', 70.00, 60)
ON CONFLICT (billing_account_id, service_category, rate_type) DO UPDATE SET
    rate_amount = EXCLUDED.rate_amount,
    time_minutes = EXCLUDED.time_minutes,
    updated_at = CURRENT_TIMESTAMP;
