-- Add service_radius_miles field to interpreters table
-- This allows interpreters to set their preferred service radius for job matching

ALTER TABLE interpreters 
ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER DEFAULT 25;

-- Add index for efficient location-based queries
CREATE INDEX IF NOT EXISTS idx_interpreters_location_radius 
ON interpreters (latitude, longitude, service_radius_miles) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Update existing interpreters to have a default radius if not set
UPDATE interpreters 
SET service_radius_miles = 25 
WHERE service_radius_miles IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN interpreters.service_radius_miles IS 'Service radius in miles for job matching based on location';



