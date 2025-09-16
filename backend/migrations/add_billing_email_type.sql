-- Migration: Add billing email type to email_type_enum
-- Date: 2024-12-19
-- Description: Adds 'billing' to the email_type_enum to support invoice emails

-- Add 'billing' to the email_type_enum
ALTER TYPE email_type_enum ADD VALUE 'billing';
