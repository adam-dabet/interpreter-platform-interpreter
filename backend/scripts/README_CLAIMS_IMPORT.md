# Claims Import Script

This script imports claims and claimants data from a CSV file into the database.

## 📋 Required CSV Fields

The CSV must contain the following columns (exact names required):

| CSV Column | Database Field | Description | Required |
|------------|----------------|-------------|----------|
| **Case/Client/City** | case_type | Case description or client city | No |
| **Claimant Add** | address | Claimant's address | No |
| **Contact/Cla** | contact_claims_handler_name | Contact/Claims Handler name | No |
| **Diagnosis** | diagnosis | Medical diagnosis | No |
| **DOB** | date_of_birth | Date of birth (YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY) | No |
| **DOI** | date_of_injury | Date of injury (YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY) | No |
| **Employer/Ins** | employer_insured | Employer or insurance company | No |
| **First Name** | first_name | Claimant's first name | **Yes** |
| **Gender** | gender | Claimant's gender | No |
| **Language** | language | Preferred language | No |
| **Primary Phon** | phone | Primary phone number | No |
| **State** | state | State abbreviation | No |
| **Zip** | zip | ZIP code | No |
| **Billing Accou** | billing_account_name | Billing account name | No |
| **Last Name** | last_name | Claimant's last name | **Yes** |
| **Adjusters Assistant: Full Na** | adjusters_assistant_name | Adjuster's assistant name | No |

## 🚀 Usage

### 1. Prepare Your CSV File

- Ensure your CSV has the exact column names listed above
- Place your CSV file in the `backend/` directory
- Update the `CSV_FILE_PATH` variable in the script if needed

### 2. Run the Import

```bash
cd backend
node scripts/import_claims.js
```

### 3. Monitor Progress

The script will show:
- CSV validation results
- Row-by-row processing progress
- Customer creation notifications
- Success/error messages for each record

## 🔄 What the Script Does

### For Each CSV Row:

1. **Creates a Claimant** with:
   - Personal information (name, DOB, gender, phone, language)
   - Address details (address, state, zip)
   - Employer/insurance information
   - Links to billing account (if found)

2. **Creates a Claim** linked to the claimant with:
   - Case information (case type, diagnosis, dates)
   - Contact references (claims handler, adjuster's assistant)
   - Auto-generated claim number

3. **Handles Contacts**:
   - Finds existing customers by name
   - Creates new customers if not found
   - Links them to the claim

## ⚠️ Important Notes

### Data Validation:
- **First Name** and **Last Name** are required
- Invalid dates will be set to NULL
- Phone numbers are cleaned and formatted
- Empty fields are handled gracefully

### Customer Creation:
- New customers get auto-generated emails
- Title is set to "Imported from Claims CSV"
- Uses system user ID for creation

### Billing Accounts:
- Must exist in the database
- Must be active (`is_active = true`)
- Claims without valid billing accounts will have `billing_account_id = NULL`

### Claim Numbers:
- Auto-generated in format: `IMPORT-{timestamp}-{random}`
- Example: `IMPORT-1733000000000-abc123def`

## 🐛 Troubleshooting

### Common Issues:

1. **"CSV file not found"**
   - Check file path in `CSV_FILE_PATH`
   - Ensure file is in the correct directory

2. **"Missing required fields"**
   - Verify CSV column names match exactly
   - Check for extra spaces or special characters

3. **"Billing account not found"**
   - Ensure billing account exists and is active
   - Check spelling in CSV vs database

4. **Database connection errors**
   - Verify `.env` file configuration
   - Check database is running

### Error Handling:
- Script continues processing other rows if one fails
- Detailed error messages for debugging
- All errors are logged to console

## 📊 Sample CSV

See `claims_import_sample.csv` for a working example with sample data.

## 🔧 Customization

### Modify Field Mapping:
Update the `FIELD_MAPPING` object to change how CSV columns map to database fields.

### Add Validation:
Enhance the `processRow` function to add custom validation rules.

### Change Customer Creation:
Modify `findOrCreateCustomer` to customize how new customers are created.

## 📈 Performance

- Processes rows sequentially to avoid database conflicts
- Uses database transactions for data integrity
- Efficient customer lookup and creation
- Progress indicators for large imports

## 🎯 Best Practices

1. **Test with sample data first**
2. **Backup database before large imports**
3. **Verify CSV format matches requirements**
4. **Check billing account names are correct**
5. **Review created records after import**

## 📞 Support

If you encounter issues:
1. Check the console output for error messages
2. Verify CSV format matches requirements
3. Ensure database schema is up to date
4. Check all required tables exist

