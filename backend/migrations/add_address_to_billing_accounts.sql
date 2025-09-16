-- Add address column to billing_accounts table
ALTER TABLE billing_accounts 
ADD COLUMN address TEXT;

-- Add comment
COMMENT ON COLUMN billing_accounts.address IS 'Billing company address for invoices';
