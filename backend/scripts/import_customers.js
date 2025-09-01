const fs = require('fs');
const csv = require('csv-parser');
const db = require('../src/config/database');

// Configuration
const CSV_FILE_PATH = '/Users/adamdabet/Desktop/interpreter-platform/backend/scripts/zenith_customers.csv'; // Update this path to your CSV file
const BILLING_ACCOUNT_ID = 1; // Default billing account ID - update as needed

async function importCustomers() {
  const customers = [];
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log('Starting customer import...');
  console.log(`CSV file: ${CSV_FILE_PATH}`);
  console.log(`Default billing account ID: ${BILLING_ACCOUNT_ID}`);
  console.log('---');

  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        // Clean and format phone number
        let phoneNumber = row['Phone']?.trim() || '';
        if (phoneNumber) {
          // Remove common extensions like "Ext." or "x"
          phoneNumber = phoneNumber.replace(/\s*(?:Ext\.?|x|ext)\s*\d+/i, '');
          // Clean up extra spaces and limit length
          phoneNumber = phoneNumber.replace(/\s+/g, ' ').trim().substring(0, 30);
        }

        // Map CSV columns to database fields
        const customer = {
          first_name: row['First Name']?.trim() || '',
          last_name: row['Last Name']?.trim() || '',
          account_name: row['Account Name']?.trim() || '',
          phone: phoneNumber,
          email: row['Email']?.trim() || '',
          title: row['Title']?.trim() || ''
        };

        // Validate required fields
        if (!customer.first_name || !customer.last_name) {
          errors.push({
            row: customers.length + 1,
            error: 'First Name and Last Name are required',
            data: customer
          });
          errorCount++;
          return;
        }

        customers.push(customer);
      })
      .on('end', async () => {
        console.log(`CSV parsing complete. Found ${customers.length} valid customers.`);
        
        if (customers.length === 0) {
          console.log('No valid customers found to import.');
          resolve({ successCount, errorCount, errors });
          return;
        }

        // Import customers to database
        try {
          for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            
            try {
              // Combine first and last name for the name field
              const fullName = `${customer.first_name} ${customer.last_name}`.trim();
              
              // Check if customer already exists (by email or name)
              let existingCustomer = null;
              if (customer.email) {
                const existingResult = await db.query(
                  'SELECT id FROM customers WHERE email = $1 AND is_active = true',
                  [customer.email]
                );
                if (existingResult.rows.length > 0) {
                  existingCustomer = existingResult.rows[0];
                }
              }

              if (!existingCustomer && fullName) {
                const existingResult = await db.query(
                  'SELECT id FROM customers WHERE name = $1 AND is_active = true',
                  [fullName]
                );
                if (existingResult.rows.length > 0) {
                  existingCustomer = existingResult.rows[0];
                }
              }

              if (existingCustomer) {
                console.log(`⚠️  Skipping duplicate customer: ${fullName} (ID: ${existingCustomer.id})`);
                continue;
              }

              // Insert new customer
              const result = await db.query(`
                INSERT INTO customers (name, email, phone, title, billing_account_id, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, name, email
              `, [
                fullName,
                customer.email || null,
                customer.phone || null,
                customer.title || null,
                BILLING_ACCOUNT_ID,
                '00000000-0000-0000-0000-000000000000' // System import user ID
              ]);

              console.log(`✅ Imported: ${fullName} (ID: ${result.rows[0].id})`);
              successCount++;

            } catch (dbError) {
              console.error(`❌ Error importing customer ${customer.first_name} ${customer.last_name}:`, dbError.message);
              errors.push({
                row: i + 1,
                error: dbError.message,
                data: customer
              });
              errorCount++;
            }
          }

          console.log('\n--- Import Summary ---');
          console.log(`✅ Successfully imported: ${successCount} customers`);
          console.log(`❌ Errors: ${errorCount} customers`);
          
          if (errors.length > 0) {
            console.log('\n--- Error Details ---');
            errors.forEach((error, index) => {
              console.log(`${index + 1}. Row ${error.row}: ${error.error}`);
              console.log(`   Data: ${JSON.stringify(error.data)}`);
            });
          }

          resolve({ successCount, errorCount, errors });

        } catch (error) {
          console.error('Database error:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Function to validate CSV file structure
function validateCSVStructure(filePath) {
  return new Promise((resolve, reject) => {
    const requiredColumns = ['First Name', 'Last Name', 'Account Name', 'Phone', 'Email', 'Title'];
    const foundColumns = [];

    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        console.log('Found headers:', headers);
        foundColumns.push(...headers);
        stream.destroy();
      })
      .on('close', () => {
        const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.error('❌ Missing required columns:', missingColumns);
          console.log('Found columns:', foundColumns);
          resolve(false);
        } else {
          console.log('✅ CSV structure is valid');
          console.log('Found columns:', foundColumns);
          resolve(true);
        }
      })
      .on('error', (error) => {
        console.error('Error validating CSV:', error);
        reject(error);
      });
  });
}

// Main execution
async function main() {
  try {
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
      console.log('Please update the CSV_FILE_PATH variable in this script to point to your CSV file.');
      process.exit(1);
    }

    // Validate CSV structure
    console.log('Validating CSV structure...');
    const isValid = await validateCSVStructure(CSV_FILE_PATH);
    
    if (!isValid) {
      console.error('❌ CSV validation failed. Please check your CSV file structure.');
      process.exit(1);
    }

    // Start import
    const result = await importCustomers();
    
    console.log('\n🎉 Import process completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importCustomers, validateCSVStructure };
