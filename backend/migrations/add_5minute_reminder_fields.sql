-- Add 5-minute reminder fields to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS interpreter_5minute_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interpreter_5minute_reminder_sent_at TIMESTAMP WITH TIME ZONE;
