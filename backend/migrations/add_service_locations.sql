-- Migration: Add service locations table for admin management
-- This allows admins to manage and reuse service locations instead of entering them manually

-- Create service_locations table
CREATE TABLE IF NOT EXISTS service_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(20),
    location_contact VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX idx_service_locations_name ON service_locations(name);
CREATE INDEX idx_service_locations_city_state ON service_locations(city, state);
CREATE INDEX idx_service_locations_is_active ON service_locations(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_service_locations_updated_at 
    BEFORE UPDATE ON service_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE service_locations IS 'Service locations managed by admin for job creation';
COMMENT ON COLUMN service_locations.name IS 'Display name for the location (e.g., "Downtown Medical Center")';
COMMENT ON COLUMN service_locations.address IS 'Full address of the service location';
COMMENT ON COLUMN service_locations.phone_number IS 'Contact phone number for the location';
COMMENT ON COLUMN service_locations.location_contact IS 'Primary contact person at this location';
COMMENT ON COLUMN service_locations.latitude IS 'Geographic latitude for mapping';
COMMENT ON COLUMN service_locations.longitude IS 'Geographic longitude for mapping';

-- Insert some sample locations for testing
INSERT INTO service_locations (name, address, phone_number, location_contact, city, state, zip_code) VALUES
('Downtown Medical Center', '123 Main Street, Suite 100', '(555) 123-4567', 'Dr. Sarah Johnson', 'Los Angeles', 'CA', '90012'),
('Westside Legal Office', '456 Oak Avenue', '(555) 234-5678', 'Attorney Mike Davis', 'Los Angeles', 'CA', '90210'),
('North Valley Clinic', '789 Pine Street', '(555) 345-6789', 'Nurse Maria Rodriguez', 'Burbank', 'CA', '91505'),
('South Bay Hospital', '321 Beach Boulevard', '(555) 456-7890', 'Dr. Robert Chen', 'Torrance', 'CA', '90505'),
('Central Court House', '654 Justice Way', '(555) 567-8901', 'Clerk Jennifer Smith', 'Downey', 'CA', '90241')
ON CONFLICT DO NOTHING;
