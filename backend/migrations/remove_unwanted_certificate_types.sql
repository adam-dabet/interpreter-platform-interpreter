-- Migration: Remove unwanted certificate types completely
-- This deletes all certificate types except the three required ones

-- Delete all certificate types except the three we want to keep
DELETE FROM certificate_types WHERE code NOT IN (
    'federal_certified',
    'court_certified', 
    'ata_certified'
);

-- Verify only the three required types remain
-- This will show us what's left after deletion
