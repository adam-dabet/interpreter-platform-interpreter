-- Migration: Update rate structure to support minutes and hours
-- Run this to modify the existing hourly_rate field structure

-- Add new rate fields to interpreters table
ALTER TABLE interpreters 
ADD COLUMN rate_amount DECIMAL(10, 2),
ADD COLUMN rate_unit VARCHAR(10) CHECK (rate_unit IN ('minutes', 'hours')) DEFAULT 'hours';

-- Migrate existing hourly_rate data to new structure
UPDATE interpreters 
SET rate_amount = hourly_rate, 
    rate_unit = 'hours' 
WHERE hourly_rate IS NOT NULL;

-- Drop the old hourly_rate column
ALTER TABLE interpreters DROP COLUMN hourly_rate;

-- Rename new columns to be more descriptive
ALTER TABLE interpreters 
RENAME COLUMN rate_amount TO rate_amount;

-- Add index for rate queries
CREATE INDEX idx_interpreters_rate ON interpreters (rate_amount, rate_unit);

-- Update providers table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
        -- Add new rate fields to providers table
        ALTER TABLE providers 
        ADD COLUMN rate_amount DECIMAL(10, 2),
        ADD COLUMN rate_unit VARCHAR(10) CHECK (rate_unit IN ('minutes', 'hours')) DEFAULT 'hours';
        
        -- Migrate existing hourly_rate data to new structure
        UPDATE providers 
        SET rate_amount = hourly_rate, 
            rate_unit = 'hours' 
        WHERE hourly_rate IS NOT NULL;
        
        -- Drop the old hourly_rate column
        ALTER TABLE providers DROP COLUMN hourly_rate;
        
        -- Add index for rate queries
        CREATE INDEX idx_providers_rate ON providers (rate_amount, rate_unit);
    END IF;
END $$;

-- Update translator_applications table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translator_applications') THEN
        -- Add new rate fields to translator_applications table
        ALTER TABLE translator_applications 
        ADD COLUMN rate_amount DECIMAL(10, 2),
        ADD COLUMN rate_unit VARCHAR(10) CHECK (rate_unit IN ('minutes', 'hours')) DEFAULT 'hours';
        
        -- Note: translator_applications doesn't have hourly_rate, so no migration needed
        -- Just add the new structure for future use
    END IF;
END $$;
