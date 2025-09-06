-- Migration: Add employer/insured to claimants and claims contacts to claims
-- Date: 2025-08-30

-- Add employer/insured field to claimants table
ALTER TABLE claimants ADD COLUMN IF NOT EXISTS employer_insured VARCHAR(255);

-- Add contact/claims handler and adjuster's assistant fields to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS contact_claims_handler_id INTEGER REFERENCES customers(id);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS adjusters_assistant_id INTEGER REFERENCES customers(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claimants_employer_insured ON claimants(employer_insured);
CREATE INDEX IF NOT EXISTS idx_claims_contact_handler ON claims(contact_claims_handler_id);
CREATE INDEX IF NOT EXISTS idx_claims_adjusters_assistant ON claims(adjusters_assistant_id);

-- Add comments for documentation
COMMENT ON COLUMN claimants.employer_insured IS 'Employer or insured party name (optional field)';
COMMENT ON COLUMN claims.contact_claims_handler_id IS 'Reference to customer who is the contact/claims handler';
COMMENT ON COLUMN claims.adjusters_assistant_id IS 'Reference to customer who is the adjuster''s assistant (optional field)';

