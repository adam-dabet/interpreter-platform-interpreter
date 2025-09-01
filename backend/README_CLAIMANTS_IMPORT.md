# Claimants and Claims Import Script

This script imports claimants and their associated claims from a CSV file into the database.

## Prerequisites

1. **Database Setup**: Ensure the database is running and all migrations have been applied
2. **Dependencies**: Install required Node.js packages
3. **Environment Variables**: Set up your database connection in `.env` file

## Installation

```bash
cd backend
npm install csv-parser pg dotenv
```

## Environment Variables

Create a `.env` file in the backend directory with:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=interpreter_platform
DB_PASSWORD=your_password
DB_PORT=5432
```

## CSV File Format

The CSV file must contain the following columns (exactly as named):

| CSV Column | Database Field | Description |
|------------|----------------|-------------|
| `claim_no` | `claim_number` | Claim number from the system |
| `City` | `case_type` | City where the case is located |
| `Claimant Address` | `address` | Claimant's address |
| `Contact/Claims Handler: Full Name` | `contact_claims_handler_name` | Claims handler contact name |
| `Diagnosis` | `diagnosis` | Medical diagnosis or description |
| `DOB` | `date_of_birth` | Date of birth (YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY) |
| `DOI` | `date_of_injury` | Date of injury/incident |
| `Employer/Insured` | `employer_insured` | Employer or insurance company |
| `First Name` | `first_name` | Claimant's first name |
| `Gender` | `gender` | Gender (Male, Female, Other, Prefer not to say) |
| `Language` | `language` | Preferred language |
| `Primary Phone Number` | `phone` | Primary phone number |
| `State` | `state` | State abbreviation |
| `Zip` | `zip` | ZIP code |
| `Billing Account: Account Name` | `billing_account_name` | Billing account name |
| `Last Name` | `last_name` | Claimant's last name |
| `Adjusters Assistant: Full Name` | `adjusters_assistant_name` | Adjuster's assistant name |

## Usage

### 1. Prepare Your CSV File

- Ensure your CSV file has the exact column headers listed above
- Use the sample file `claimants_import_sample.csv` as a reference
- Place your CSV file in the `backend/` directory

### 2. Update the Script

Edit `import_claimants_with_claims.js` and update the `CSV_FILE_PATH` variable:

```javascript
const CSV_FILE_PATH = './your_file_name.csv';
```

### 3. Run the Import

```bash
cd backend
node scripts/import_claimants_with_claims.js
```

## What the Script Does

1. **Validates CSV Structure**: Checks that all required columns are present
2. **Data Cleaning**: 
   - Parses dates in multiple formats
   - Cleans phone numbers
   - Normalizes gender values
3. **Database Operations**:
   - Creates claimants with personal information
   - Creates associated claims
   - Links to existing billing accounts
   - Creates customer records for contacts if they don't exist
4. **Error Handling**: Logs all operations and errors

## Output

The script will:
- ✅ Validate your CSV structure
- 📊 Process each row
- ✅ Create claimants and claims
- 🎉 Complete the import

## Sample Output

```
🚀 Starting claimants and claims import...
✅ CSV structure validated successfully
Found 16 columns: claim_no, City, Claimant Address, Contact/Claims Handler: Full Name, Diagnosis, DOB, DOI, Employer/Insured, First Name, Gender, Language, Primary Phone Number, State, Zip, Billing Account: Account Name, Last Name, Adjusters Assistant: Full Name
📊 Processing 5 rows...

📝 Processing row 1/5
✅ Imported: John Johnson - Workers Comp

📝 Processing row 2/5
✅ Imported: Michael Brown - Personal Injury

📝 Processing row 3/5
✅ Imported: Dr. Sarah Johnson - Medical Malpractice

📝 Processing row 4/5
✅ Imported: David Wilson - Workers Comp

📝 Processing row 5/5
✅ Imported: Emily Chen - Personal Injury

🎉 Claimants and claims import completed successfully!
✅ Import completed successfully
```

## Troubleshooting

### Common Issues

1. **Missing Columns**: Ensure all required columns are present in your CSV
2. **Database Connection**: Check your `.env` file and database status
3. **Permission Errors**: Ensure the script can read your CSV file
4. **Date Format Issues**: The script handles multiple date formats automatically

### Error Messages

- `Missing required fields`: Check your CSV headers
- `Billing account not found`: The billing account name doesn't exist in the database
- `Error processing row`: Check the specific error message for details

## Database Tables

The script creates records in these tables:

- **`claimants`**: Personal information, contact details, address
- **`claims`**: Case information, diagnosis, dates
- **`customers`**: Contact information for claims handlers and adjusters

## Notes

- The script generates unique claim numbers automatically
- Existing customers are reused if found by name
- Billing accounts must exist in the database before import
- All imported records are marked as active
- The script uses a system user ID for audit trails

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your CSV format matches the requirements
3. Ensure your database is properly set up
4. Check that all required migrations have been applied
