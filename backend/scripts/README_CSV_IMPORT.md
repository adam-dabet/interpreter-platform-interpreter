# Customer CSV Import Guide

This guide explains how to import customers from a CSV file into the database.

## CSV File Format

Your CSV file must have the following columns (exact names required):

| Column Name | Required | Description |
|-------------|----------|-------------|
| First Name | ✅ Yes | Customer's first name |
| Last Name | ✅ Yes | Customer's last name |
| Account Name | ❌ No | Company or account name |
| Phone | ❌ No | Phone number |
| Email | ❌ No | Email address |
| Title | ❌ No | Job title or position |

## Sample CSV File

```csv
First Name,Last Name,Account Name,Phone,Email,Title
John,Smith,ABC Company,(555) 111-2222,john.smith@abc.com,Manager
Sarah,Johnson,XYZ Corp,(555) 333-4444,sarah.johnson@xyz.com,Director
Mike,Davis,123 Industries,(555) 555-6666,mike.davis@123.com,VP
```

## How to Import

### Step 1: Prepare Your CSV File

1. Create a CSV file with the required columns
2. Make sure the column names match exactly (case-sensitive)
3. Save the file in the backend directory

### Step 2: Configure the Import Script

Edit `scripts/import_customers.js` and update these variables:

```javascript
const CSV_FILE_PATH = './your_file_name.csv'; // Path to your CSV file
const BILLING_ACCOUNT_ID = 1; // Billing account ID to assign to imported customers
```

### Step 3: Run the Import

```bash
cd backend
node scripts/import_customers.js
```

## Import Features

### ✅ Validation
- Validates CSV structure and required columns
- Checks for required fields (First Name, Last Name)
- Validates data format

### ✅ Duplicate Detection
- Checks for existing customers by email
- Checks for existing customers by full name
- Skips duplicates automatically

### ✅ Error Handling
- Detailed error reporting
- Continues processing even if some records fail
- Summary report at the end

### ✅ Data Mapping
- Combines First Name + Last Name into the `name` field
- Maps all CSV columns to appropriate database fields
- Handles empty/optional fields gracefully

## Import Results

The script will show:
- ✅ Successfully imported customers
- ⚠️ Skipped duplicates
- ❌ Failed imports with error details
- Summary statistics

## Example Output

```
Starting customer import...
CSV file: ./customer_import.csv
Default billing account ID: 1
---
Validating CSV structure...
✅ CSV structure is valid
Found columns: ['First Name', 'Last Name', 'Account Name', 'Phone', 'Email', 'Title']
CSV parsing complete. Found 5 valid customers.
✅ Imported: John Smith (ID: 6)
✅ Imported: Sarah Johnson (ID: 7)
⚠️  Skipping duplicate customer: Mike Davis (ID: 3)
✅ Imported: Lisa Chen (ID: 8)
✅ Imported: Robert Wilson (ID: 9)

--- Import Summary ---
✅ Successfully imported: 4 customers
❌ Errors: 0 customers

🎉 Import process completed!
```

## Troubleshooting

### Common Issues

1. **"CSV file not found"**
   - Check the `CSV_FILE_PATH` variable in the script
   - Make sure the file exists in the specified location

2. **"Missing required columns"**
   - Verify column names match exactly (including spaces)
   - Check for extra spaces or special characters

3. **"Database connection error"**
   - Make sure the database is running
   - Check database configuration in `src/config/database.js`

4. **"Foreign key constraint violation"**
   - Verify the `BILLING_ACCOUNT_ID` exists in the billing_accounts table
   - Update the ID to a valid billing account

### Getting Help

If you encounter issues:
1. Check the error messages in the console output
2. Verify your CSV file format matches the sample
3. Ensure the database is accessible
4. Check that all required dependencies are installed

## Notes

- The script uses a system user ID (`00000000-0000-0000-0000-000000000000`) for the `created_by` field
- All imported customers will be assigned to the specified billing account
- The script is safe to run multiple times (duplicates will be skipped)
- Empty fields in the CSV will be stored as NULL in the database
