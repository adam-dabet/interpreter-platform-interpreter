-- Add attachments column to email_queue table
ALTER TABLE email_queue 
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN email_queue.attachments IS 'JSON array of attachment objects with filename and path';
