const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 SIMPLE TEST IMPORT: Starting import of 3 rows only...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const CSV_FILE_PATH = './scripts/zenith_claims_fixed.csv';

async function simpleTestImport() {
  const client = await pool.connect();
  
  try {
    console.log('📖 Reading CSV file...');
    
    // Read the entire file first, then process only what we need
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
    
    // Only process the first 3 rows
    const rowsToProcess = allRows.slice(0, 3);
    console.log(`🎯 Processing ${rowsToProcess.length} rows...`);
    
    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      console.log(`\n📝 Processing row ${i + 1}: ${row['First Name']} ${row['Last Name']}`);
      
      // Extract data
      const first_name = row['First Name']?.trim() || '';
      const last_name = row['Last Name']?.trim() || '';
      const claim_number = row['Claim_no']?.trim() || '';
      const language = row['Language']?.trim() || '';
      
      console.log(`  Name: ${first_name} ${last_name}`);
      console.log(`  Claim: ${claim_number}`);
      console.log(`  Language: ${language}`);
      
      // Skip if no name
      if (!first_name || !last_name) {
        console.log(`  ⚠️  Skipping: Missing name`);
        continue;
      }
      
      // Test database operations without actually inserting
      console.log(`  🔍 Testing database lookups...`);
      
      // Test customer lookup
      if (row['Contact/Claims Handler: Full Name']) {
        const customerResult = await client.query(
          'SELECT id FROM customers WHERE name = $1 AND is_active = true LIMIT 1',
          [row['Contact/Claims Handler: Full Name'].trim()]
        );
        console.log(`    Contact handler: ${customerResult.rows.length > 0 ? 'Found' : 'Not found'}`);
      }
      
      // Test billing account lookup
      if (row['Billing Account: Account Name']) {
        const billingResult = await client.query(
          'SELECT id FROM billing_accounts WHERE name = $1 AND is_active = true LIMIT 1',
          [row['Billing Account: Account Name'].trim()]
        );
        console.log(`    Billing account: ${billingResult.rows.length > 0 ? 'Found' : 'Not found'}`);
      }
      
      console.log(`  ✅ Row ${i + 1} processed successfully`);
    }
    
    console.log('\n🎉 SIMPLE TEST IMPORT completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

simpleTestImport();
