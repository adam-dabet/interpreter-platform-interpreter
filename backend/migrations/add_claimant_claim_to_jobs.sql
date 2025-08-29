-- Migration: Add claimant and claim references to jobs table
-- This allows linking jobs to specific claimants and their claims

-- Add claimant_id and claim_id columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claimant_id INTEGER REFERENCES claimants(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claim_id INTEGER REFERENCES claims(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_claimant_id ON jobs(claimant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_claim_id ON jobs(claim_id);

-- Add comments
COMMENT ON COLUMN jobs.claimant_id IS 'Reference to claimant for this job';
COMMENT ON COLUMN jobs.claim_id IS 'Reference to specific claim for this job';
