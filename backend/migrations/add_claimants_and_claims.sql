-- Migration: Add claimants and claims tables
-- This allows managing claimants and their associated claims

-- Create claimants table
CREATE TABLE IF NOT EXISTS claimants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    date_of_birth DATE,
    phone VARCHAR(20),
    language VARCHAR(100),
    billing_account_id INTEGER REFERENCES billing_accounts(id),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id)
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    claimant_id INTEGER NOT NULL REFERENCES claimants(id) ON DELETE CASCADE,
    case_type VARCHAR(100) NOT NULL,
    claim_number VARCHAR(100) NOT NULL,
    date_of_injury DATE,
    diagnosis TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX idx_claimants_name ON claimants(name);
CREATE INDEX idx_claimants_billing_account ON claimants(billing_account_id);
CREATE INDEX idx_claimants_is_active ON claimants(is_active);
CREATE INDEX idx_claims_claimant_id ON claims(claimant_id);
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_case_type ON claims(case_type);
CREATE INDEX idx_claims_is_active ON claims(is_active);

-- Create triggers for updated_at
CREATE TRIGGER update_claimants_updated_at 
    BEFORE UPDATE ON claimants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at 
    BEFORE UPDATE ON claims 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE claimants IS 'Claimants/clients with personal and contact information';
COMMENT ON COLUMN claimants.name IS 'Claimant full name';
COMMENT ON COLUMN claimants.gender IS 'Claimant gender (Male, Female, Other, Prefer not to say)';
COMMENT ON COLUMN claimants.date_of_birth IS 'Claimant date of birth';
COMMENT ON COLUMN claimants.phone IS 'Claimant phone number';
COMMENT ON COLUMN claimants.language IS 'Claimant preferred language';
COMMENT ON COLUMN claimants.billing_account_id IS 'Reference to billing account for rate structure';
COMMENT ON COLUMN claimants.address IS 'Claimant address';

COMMENT ON TABLE claims IS 'Claims associated with claimants';
COMMENT ON COLUMN claims.claimant_id IS 'Reference to claimant';
COMMENT ON COLUMN claims.case_type IS 'Type of case (e.g., Workers Comp, Personal Injury, etc.)';
COMMENT ON COLUMN claims.claim_number IS 'Unique claim number';
COMMENT ON COLUMN claims.date_of_injury IS 'Date of injury or incident';
COMMENT ON COLUMN claims.diagnosis IS 'Medical diagnosis or description';

-- Insert sample claimants
INSERT INTO claimants (name, gender, date_of_birth, phone, language, billing_account_id, address) VALUES
('Maria Rodriguez', 'Female', '1985-03-15', '(555) 111-2222', 'Spanish', 1, '123 Main St, Los Angeles, CA 90210'),
('James Wilson', 'Male', '1978-07-22', '(555) 333-4444', 'English', 1, '456 Oak Ave, San Francisco, CA 94102'),
('Fatima Al-Zahra', 'Female', '1992-11-08', '(555) 555-6666', 'Arabic', 1, '789 Pine Rd, San Diego, CA 92101'),
('Carlos Mendez', 'Male', '1980-12-03', '(555) 777-8888', 'Spanish', 1, '321 Elm St, Sacramento, CA 95814'),
('Yuki Tanaka', 'Female', '1988-05-19', '(555) 999-0000', 'Japanese', 1, '654 Maple Dr, Fresno, CA 93710')
ON CONFLICT DO NOTHING;

-- Insert sample claims
INSERT INTO claims (claimant_id, case_type, claim_number, date_of_injury, diagnosis) VALUES
(1, 'Workers Compensation', 'WC-2024-001', '2024-01-15', 'Lower back strain from lifting heavy objects'),
(1, 'Personal Injury', 'PI-2024-002', '2024-02-20', 'Whiplash from car accident'),
(2, 'Workers Compensation', 'WC-2024-003', '2024-01-30', 'Repetitive stress injury to wrist'),
(3, 'Medical Malpractice', 'MM-2024-001', '2023-12-10', 'Surgical complication requiring additional procedures'),
(4, 'Workers Compensation', 'WC-2024-004', '2024-03-05', 'Slip and fall resulting in ankle fracture'),
(5, 'Personal Injury', 'PI-2024-003', '2024-02-28', 'Head injury from workplace accident')
ON CONFLICT DO NOTHING;
