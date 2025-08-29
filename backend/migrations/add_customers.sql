-- Migration: Add customers table with billing account relationships
-- This allows managing customers and linking them to specific billing accounts

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    title VARCHAR(100),
    billing_account_id INTEGER REFERENCES billing_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_billing_account ON customers(billing_account_id);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE customers IS 'Customers/clients with billing account relationships';
COMMENT ON COLUMN customers.name IS 'Customer full name';
COMMENT ON COLUMN customers.email IS 'Customer email address';
COMMENT ON COLUMN customers.phone IS 'Customer phone number';
COMMENT ON COLUMN customers.title IS 'Customer job title or position (optional)';
COMMENT ON COLUMN customers.billing_account_id IS 'Reference to billing account for rate structure';

-- Insert sample customers
INSERT INTO customers (name, email, phone, title, billing_account_id) VALUES
('John Smith', 'john.smith@company.com', '(555) 111-2222', 'HR Manager', 1),
('Sarah Johnson', 'sarah.johnson@lawfirm.com', '(555) 333-4444', 'Legal Assistant', 1),
('Mike Davis', 'mike.davis@hospital.com', '(555) 555-6666', 'Medical Director', 1),
('Lisa Chen', 'lisa.chen@clinic.com', '(555) 777-8888', 'Office Manager', 1),
('Robert Wilson', 'robert.wilson@agency.com', '(555) 999-0000', 'Case Manager', 1)
ON CONFLICT DO NOTHING;
