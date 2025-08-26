-- Migration: Add interpreter_types table and populate with required types
-- This creates a proper interpreter_types table separate from certificate_types

-- Create interpreter_types table
CREATE TABLE IF NOT EXISTS interpreter_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Insert interpreter types
INSERT INTO interpreter_types (code, name, description, is_active, sort_order) VALUES
('non_certified', 'Non-Certified Interpreter', 'Non-certified interpreter without formal certifications', true, 1),
('qualified_standard', 'Qualified / Standard', 'Qualified or Standard interpreter level', true, 2),
('court_certified', 'Court Certified Interpreter', 'Court certified interpreter with legal certifications', true, 3),
('medical_certified', 'Medical Certified Interpreter', 'Medical certified interpreter with healthcare certifications', true, 4)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_interpreter_types_active ON interpreter_types(is_active);
CREATE INDEX IF NOT EXISTS idx_interpreter_types_sort ON interpreter_types(sort_order);
