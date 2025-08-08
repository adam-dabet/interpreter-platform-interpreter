-- Update W9 form certificate type to not be required since it's handled in a separate step
UPDATE certificate_types 
SET is_required = false 
WHERE code = 'w9_form'; 