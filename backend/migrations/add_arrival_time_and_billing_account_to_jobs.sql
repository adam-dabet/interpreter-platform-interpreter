-- Migration: Add arrival_time and billing_account_id to jobs table
-- Date: 2024-12-19
-- Description: Adds arrival time and billing account reference to jobs for better scheduling and billing

-- Add arrival_time column to jobs table
ALTER TABLE jobs ADD COLUMN arrival_time TIME;

-- Add billing_account_id column to jobs table
ALTER TABLE jobs ADD COLUMN billing_account_id INTEGER REFERENCES billing_accounts(id);

-- Create index on billing_account_id for better query performance
CREATE INDEX idx_jobs_billing_account ON jobs(billing_account_id);

-- Add comments for documentation
COMMENT ON COLUMN jobs.arrival_time IS 'Time when interpreter should arrive at the location';
COMMENT ON COLUMN jobs.billing_account_id IS 'Reference to the billing account for this job';

-- Update existing jobs to have NULL values for new columns
-- (This is automatic for new columns, but explicitly documented)
