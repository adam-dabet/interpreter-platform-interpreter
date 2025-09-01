const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// CSV file path - update this to your actual CSV file
const CSV_FILE_PATH = '/Users/adamdabet/Desktop/interpreter-platform/backend/scripts/zenith_claims_fixed.csv';

// Field mapping from CSV to database
const FIELD_MAPPING = {
  'Cases/Claims Name': 'case_name',
  'Claim_no': 'claim_number',
  'City': 'case_client_city',
  'Claimant Address': 'claimant_address',
  'Contact/Claims Handler: Full Name': 'contact_claims_handler_name',
  'Diagnosis': 'diagnosis',
  'DOB': 'date_of_birth',
  'DOI': 'date_of_injury',
  'Employer/Insured': 'employer_insured',
  'First Name': 'first_name',
  'Gender': 'gender',
  'Language': 'language',
  'Primary Phone Number': 'phone',
  'State': 'state',
  'Zip': 'zip',
  'Billing Account: Account Name': 'billing_account_name',
  'Last Name': 'last_name',
  'Adjusters Assistant: Full Name': 'adjusters_assistant_name'
};

// Validate CSV structure
function validateCSVStructure(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const results = [];
    
    stream.pipe(csv())
      .on('data', (data) => {
        results.push(data);
        if (results.length > 1) { // Only read first few rows for validation
          stream.destroy();
        }
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }
        
        const headers = Object.keys(results[0]);
        const requiredFields = Object.keys(FIELD_MAPPING);
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        
        if (missingFields.length > 0) {
          reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
          return;
        }
        
        console.log('✅ CSV structure validated successfully');
        console.log(`Found ${headers.length} columns:`, headers.join(', '));
        resolve();
      })
      .on('error', (error) => {
        reject(new Error(`Error reading CSV: ${error.message}`));
      });
  });
}

// Parse date in various formats
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Try different date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY or M-D-YYYY
  ];
  
  if (formats[0].test(dateString)) {
    return dateString; // Already in correct format
  }
  
  if (formats[1].test(dateString) || formats[2].test(dateString)) {
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  console.warn(`⚠️  Could not parse date: ${dateString}`);
  return null;
}

// Clean and validate phone number
function cleanPhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle common phone number lengths
  if (cleaned.length === 10) {
    return cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  } else if (cleaned.length > 10) {
    return cleaned.substring(0, 10);
  }
  
  return cleaned;
}

// Clean and validate gender
function cleanGender(gender) {
  if (!gender) return null;
  
  const cleanGender = gender.trim().toLowerCase();
  
  // Map common gender values to database enum values
  const genderMap = {
    'm': 'Male',
    'male': 'Male',
    'f': 'Female',
    'female': 'Female',
    'o': 'Other',
    'other': 'Other',
    'prefer not to say': 'Prefer not to say',
    'unknown': 'Prefer not to say'
  };
  
  return genderMap[cleanGender] || 'Prefer not to say';
}

// Find or create customer by name
async function findOrCreateCustomer(customerName, pool) {
  if (!customerName || customerName.trim() === '') {
    return null;
  }
  
  try {
    // First try to find existing customer
    const findResult = await pool.query(
      'SELECT id FROM customers WHERE name = $1 AND is_active = true',
      [customerName.trim()]
    );
    
    if (findResult.rows.length > 0) {
      return findResult.rows[0].id;
    }
    
    // Create new customer if not found
    const createResult = await pool.query(
      `INSERT INTO customers (name, email, phone, title, billing_account_id, created_by, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id`,
      [
        customerName.trim(),
        `${customerName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
        null,
        'Imported from Claims CSV',
        null, // Will be updated later if billing account is found
        '00000000-0000-0000-0000-000000000000' // System user
      ]
    );
    
    console.log(`✅ Created new customer: ${customerName}`);
    return createResult.rows[0].id;
    
  } catch (error) {
    console.error(`❌ Error finding/creating customer ${customerName}:`, error.message);
    return null;
  }
}

// Find billing account by name
async function findBillingAccount(billingAccountName, pool) {
  if (!billingAccountName || billingAccountName.trim() === '') {
    return null;
  }
  
  try {
    const result = await pool.query(
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

// Process a single row
async function processRow(row, pool) {
  try {
    // Parse and clean data
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
    
    // Claim data
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
    
    // Skip rows with no meaningful data
    if (!claim_number && !first_name && !last_name) {
      console.warn(`⚠️  Skipping empty row`);
      return;
    }
    
    // Find or create customers for contacts
    const contact_claims_handler_id = await findOrCreateCustomer(contact_claims_handler_name, pool);
    const adjusters_assistant_id = await findOrCreateCustomer(adjusters_assistant_name, pool);
    
    // Find billing account
    const billing_account_id = await findBillingAccount(billing_account_name, pool);
    
    // Create claimant
    const claimantResult = await pool.query(
      `INSERT INTO claimants (
        first_name, last_name, gender, date_of_birth, phone, language, 
        billing_account_id, address, employer_insured, is_active, created_at, updated_at,
        created_by, last_updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW(), $10, $10)
      RETURNING id`,
      [
        first_name, last_name, gender, date_of_birth, phone, language,
        billing_account_id, address, employer_insured,
        '00000000-0000-0000-0000-000000000000' // System user
      ]
    );
    
    const claimant_id = claimantResult.rows[0].id;
    
    // Create claim
    await pool.query(
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
        '00000000-0000-0000-0000-000000000000' // System user
      ]
    );
    
    console.log(`✅ Imported: ${first_name} ${last_name} - ${case_client_city}`);
    
  } catch (error) {
    console.error(`❌ Error processing row:`, error.message);
    throw error;
  }
}

// Main import function
async function importClaimantsWithClaims() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting claimants and claims import...');
    
    // Validate CSV structure
    await validateCSVStructure(CSV_FILE_PATH);
    
    // Read and process CSV
    const results = [];
    const stream = fs.createReadStream(CSV_FILE_PATH);
    
    await new Promise((resolve, reject) => {
      stream.pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            console.log(`📊 Processing ${results.length} rows...`);
            
            // Process each row
            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              if (i % 50 === 0 || i === results.length - 1) {
                console.log(`📝 Processing row ${i + 1}/${results.length} (${Math.round(((i + 1) / results.length) * 100)}%)`);
              }
              await processRow(row, client);
            }
            
            console.log('\n🎉 Claimants and claims import completed successfully!');
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(new Error(`Error reading CSV: ${error.message}`));
        });
    });
    
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
  importClaimantsWithClaims()
    .then(() => {
      console.log('✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importClaimantsWithClaims };
