-- Customer Magic Links Authentication System
-- This migration adds passwordless authentication for customers

-- 1. Create magic links table
CREATE TABLE IF NOT EXISTS customer_magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link details
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    
    -- Expiration and usage
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    
    -- Request metadata
    requested_ip VARCHAR(50),
    requested_user_agent TEXT,
    used_ip VARCHAR(50),
    used_user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create customer sessions table for managing active sessions
CREATE TABLE IF NOT EXISTS customer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session details
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- Session metadata
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Extend customers table if it doesn't have all necessary fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON customer_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON customer_magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON customer_magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);

-- 5. Create function to cleanup expired magic links
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM customer_magic_links 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_customer_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE customer_sessions 
    SET is_active = FALSE 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_customer_auth_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_magic_links_updated_at ON customer_magic_links;
CREATE TRIGGER update_customer_magic_links_updated_at 
    BEFORE UPDATE ON customer_magic_links 
    FOR EACH ROW EXECUTE FUNCTION update_customer_auth_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_sessions_updated_at ON customer_sessions;
CREATE TRIGGER update_customer_sessions_updated_at 
    BEFORE UPDATE ON customer_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_customer_auth_updated_at_column();

-- 8. Insert sample customers if they don't exist (for testing)
INSERT INTO customers (name, email, phone, title, is_active)
VALUES 
    ('ABC Insurance Company', 'adjuster1@abcinsurance.com', '555-123-4567', 'Claims Adjuster', true),
    ('XYZ Claims Services', 'claims@xyzclaims.com', '555-987-6543', 'Senior Adjuster', true),
    ('Pacific Workers Comp', 'adjusters@pacificwc.com', '555-555-1234', 'Claims Handler', true)
ON CONFLICT (email) DO NOTHING;

-- 9. Create sample claimants for these customers
INSERT INTO claimants (first_name, last_name, name, phone, date_of_birth, language, is_active)
VALUES 
    ('John', 'Smith', 'John Smith', '555-111-2222', '1980-05-15', 'Spanish', true),
    ('Maria', 'Garcia', 'Maria Garcia', '555-333-4444', '1975-09-22', 'Spanish', true),
    ('David', 'Chen', 'David Chen', '555-777-8888', '1985-12-03', 'Mandarin', true)
ON CONFLICT DO NOTHING;

-- 10. Create sample claims for these claimants
INSERT INTO claims (claim_number, case_type, date_of_injury, claimant_id, adjusters_assistant_id, is_active)
SELECT 
    'WC-2024-001', 'Work Injury', '2024-01-15', 
    (SELECT id FROM claimants WHERE first_name = 'John' AND last_name = 'Smith' LIMIT 1),
    (SELECT id FROM customers WHERE email = 'adjuster1@abcinsurance.com' LIMIT 1),
    true
WHERE NOT EXISTS (SELECT 1 FROM claims WHERE claim_number = 'WC-2024-001');

INSERT INTO claims (claim_number, case_type, date_of_injury, claimant_id, adjusters_assistant_id, is_active)
SELECT 
    'WC-2024-002', 'Medical Treatment', '2024-02-20', 
    (SELECT id FROM claimants WHERE first_name = 'Maria' AND last_name = 'Garcia' LIMIT 1),
    (SELECT id FROM customers WHERE email = 'claims@xyzclaims.com' LIMIT 1),
    true
WHERE NOT EXISTS (SELECT 1 FROM claims WHERE claim_number = 'WC-2024-002');

INSERT INTO claims (claim_number, case_type, date_of_injury, claimant_id, adjusters_assistant_id, is_active)
SELECT 
    'WC-2024-003', 'Physical Therapy', '2024-01-30', 
    (SELECT id FROM claimants WHERE first_name = 'David' AND last_name = 'Chen' LIMIT 1),
    (SELECT id FROM customers WHERE email = 'adjusters@pacificwc.com' LIMIT 1),
    true
WHERE NOT EXISTS (SELECT 1 FROM claims WHERE claim_number = 'WC-2024-003');

COMMENT ON TABLE customer_magic_links IS 'Stores passwordless authentication magic links for customers';
COMMENT ON TABLE customer_sessions IS 'Manages active customer sessions with refresh tokens';
