-- Add password_changed field to users table to track if user has changed from default password
ALTER TABLE users ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;

-- Update existing users to have password_changed = true (assuming they've already changed their passwords)
UPDATE users SET password_changed = TRUE WHERE password_changed IS NULL;
