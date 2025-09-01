const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

console.log('🚀 WORKING IMPORT SCRIPT: Starting import...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const CSV_FILE_PATH = './scripts/zenith_claims_2023-08:31:2025.csv';

// Helper functions
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Remove any extra whitespace
  dateString = dateString.trim();
  
  // Handle YYYY-MM-DD format (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle MM/DD/YYYY or MM-DD-YYYY format
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateString)) {
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // Validate day and month
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        console.warn(`⚠️  Invalid date values: day=${day}, month=${month} in "${dateString}"`);
        return null;
      }
      
      // Handle 2-digit years (assume 20xx for years < 50, 19xx for years >= 50)
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      
      // Format as YYYY-MM-DD
      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      const formattedYear = year.toString();
      
      return `${formattedYear}-${formattedMonth}-${formattedDay}`;
    }
  }
  
  console.warn(`⚠️  Could not parse date: "${dateString}"`);
  return null;
}

function cleanPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return cleaned.substring(1);
  return cleaned.length > 10 ? cleaned.substring(0, 10) : cleaned;
}

function cleanGender(gender) {
  if (!gender) return null;
  const cleanGender = gender.trim().toLowerCase();
  const genderMap = {
    'm': 'Male', 'male': 'Male',
    'f': 'Female', 'female': 'Female',
    'o': 'Other', 'other': 'Other'
  };
  return genderMap[cleanGender] || 'Prefer not to say';
}

async function findOrCreateCustomer(customerName, client) {
  if (!customerName || customerName.trim() === '') return null;
  
  try {
    const findResult = await client.query(
      'SELECT id FROM customers WHERE name = $1 AND is_active = true',
      [customerName.trim()]
    );
    
    if (findResult.rows.length > 0) {
      return findResult.rows[0].id;
    }
    
    // Create new customer
    const createResult = await client.query(
      `INSERT INTO customers (name, email, phone, title, billing_account_id, created_by, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id`,
      [
        customerName.trim(),
        `${customerName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
        null,
        'Imported from Claims CSV',
        null,
        '00000000-0000-0000-0000-000000000000'
      ]
    );
    
    console.log(`✅ Created new customer: ${customerName}`);
    return createResult.rows[0].id;
    
  } catch (error) {
    console.error(`❌ Error with customer ${customerName}:`, error.message);
    return null;
  }
}

async function findBillingAccount(billingAccountName, client) {
  if (!billingAccountName || billingAccountName.trim() === '') return null;
  
  try {
    const result = await client.query(
      'SELECT id FROM billing_accounts WHERE name = $1 AND is_active = true',
      [billingAccountName.trim()]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    console.warn(`⚠️  Billing account not found: ${billingAccountName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error finding billing account ${billingAccountName}:`, error.message);
    return null;
  }
}

async function processRow(row, client) {
  try {
    // Extract data
    const first_name = row['First Name']?.trim() || '';
    const last_name = row['Last Name']?.trim() || '';
    const gender = cleanGender(row['Gender']);
    const date_of_birth = parseDate(row['DOB']);
    const phone = cleanPhone(row['Primary Phone Number']);
    const language = row['Language']?.trim() || '';
    const employer_insured = row['Employer/Insured']?.trim() || '';
    const address = row['Claimant Address']?.trim() || '';
    const state = row['State']?.trim() || '';
    const zip = row['Zip']?.trim() || '';
    
    const case_client_city = row['City']?.trim() || '';
    const diagnosis = row['Diagnosis']?.trim() || '';
    const date_of_injury = parseDate(row['DOI']);
    const contact_claims_handler_name = row['Contact/Claims Handler: Full Name']?.trim() || '';
    const adjusters_assistant_name = row['Adjusters Assistant: Full Name']?.trim() || '';
    const billing_account_name = row['Billing Account: Account Name']?.trim() || '';
    const claim_number = row['Claim_no']?.trim() || '';
    
    // Validation
    if (!first_name || !last_name) {
      console.warn(`⚠️  Skipping row ${claim_number || 'unknown'}: Missing first or last name`);
      return;
    }
    
    // Find or create customers for contacts
    const contact_claims_handler_id = await findOrCreateCustomer(contact_claims_handler_name, client);
    const adjusters_assistant_id = await findOrCreateCustomer(adjusters_assistant_name, client);
    
    // Find billing account
    const billing_account_id = await findBillingAccount(billing_account_name, client);
    
    // Create claimant
    const claimantResult = await client.query(
      `INSERT INTO claimants (
        first_name, last_name, gender, date_of_birth, phone, language, 
        billing_account_id, address, employer_insured, is_active, created_at, updated_at,
        created_by, last_updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW(), $10, $10)
      RETURNING id`,
      [
        first_name, last_name, gender, date_of_birth, phone, language,
        billing_account_id, address, employer_insured,
        '00000000-0000-0000-0000-000000000000'
      ]
    );
    
    const claimant_id = claimantResult.rows[0].id;
    
    // Create claim
    await client.query(
      `INSERT INTO claims (
        claimant_id, case_type, claim_number, date_of_injury, diagnosis,
        contact_claims_handler_id, adjusters_assistant_id,
        created_by, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
      [
        claimant_id,
        case_client_city || 'Imported Case',
        claim_number || `IMPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date_of_injury,
        diagnosis,
        contact_claims_handler_id,
        adjusters_assistant_id,
        '00000000-0000-0000-0000-000000000000'
      ]
    );
    
    console.log(`✅ Imported: ${first_name} ${last_name} - ${claim_number} - ${case_client_city}`);
    
  } catch (error) {
    console.error(`❌ Error processing row:`, error.message);
    throw error;
  }
}

async function importAll() {
  const client = await pool.connect();
  
  try {
    console.log('📖 Reading CSV file...');
    
    // Read the entire file first
    const allRows = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          allRows.push(row);
        })
        .on('end', () => {
          console.log(`✅ CSV read complete. Total rows: ${allRows.length}`);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    console.log(`🎯 Processing ${allRows.length} rows...`);
    
    // Process each row
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      
      if (i % 50 === 0 || i === allRows.length - 1) {
        console.log(`📝 Processing row ${i + 1}/${allRows.length} (${Math.round(((i + 1) / allRows.length) * 100)}%)`);
      }
      
      await processRow(row, client);
    }
    
    console.log('\n🎉 Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
if (require.main === module) {
  importAll()
    .then(() => {
      console.log('✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importAll };
