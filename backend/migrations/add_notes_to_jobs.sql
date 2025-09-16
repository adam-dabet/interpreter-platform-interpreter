-- Add notes column to jobs table
ALTER TABLE jobs 
ADD COLUMN notes TEXT;

-- Add comment
COMMENT ON COLUMN jobs.notes IS 'Additional notes or comments for the job';
