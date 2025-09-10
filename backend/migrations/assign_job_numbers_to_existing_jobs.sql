-- Assign job numbers to existing jobs that don't have them
-- This will generate sequential job numbers starting from JOB-000001

WITH numbered_jobs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM jobs 
  WHERE job_number IS NULL
)
UPDATE jobs 
SET job_number = 'JOB-' || LPAD(row_num::text, 6, '0')
FROM numbered_jobs 
WHERE jobs.id = numbered_jobs.id;

-- Verify the update
SELECT COUNT(*) as jobs_with_numbers FROM jobs WHERE job_number IS NOT NULL;
