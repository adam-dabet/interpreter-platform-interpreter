const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 FIXING: Updating imported data with proper names and dates...');

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

function extractNameFromCasesName(casesName) {
  if (!casesName) return { firstName: '', lastName: '' };
  
  // Remove the claim number from the beginning
  const namePart = casesName.replace(/^\d+\s*/, '').trim();
  
  if (!namePart) return { firstName: '', lastName: '' };
  
  const nameParts = namePart.split(' ');
  
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' };
  } else if (nameParts.length === 2) {
    return { firstName: nameParts[0], lastName: nameParts[1] };
  } else {
    // For names with more than 2 parts, take first as first name, rest as last name
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    return { firstName, lastName };
  }
}

async function fixImportedData() {
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
    
    console.log(`🎯 Processing ${allRows.length} rows to fix data...`);
    
    let updatedCount = 0;
    
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      
      if (i % 100 === 0 || i === allRows.length - 1) {
        console.log(`📝 Processing row ${i + 1}/${allRows.length} (${Math.round(((i + 1) / allRows.length) * 100)}%)`);
      }
      
      const claim_number = row['Claim_no']?.trim() || '';
      const casesName = row['Cases/Claims Name']?.trim() || '';
      const dob = row['DOB']?.trim() || '';
      const doi = row['DOI']?.trim() || '';
      
      if (!claim_number) continue;
      
      // Extract names from Cases/Claims Name if First/Last Name are empty
      let firstName = row['First Name']?.trim() || '';
      let lastName = row['Last Name']?.trim() || '';
      
      if (!firstName && !lastName && casesName) {
        const extractedNames = extractNameFromCasesName(casesName);
        firstName = extractedNames.firstName;
        lastName = extractedNames.lastName;
      }
      
      if (!firstName || !lastName) continue;
      
      // Parse dates
      const date_of_birth = parseDate(dob);
      const date_of_injury = parseDate(doi);
      
      // Find the claimant by claim number
      const claimResult = await client.query(
        'SELECT id, claimant_id FROM claims WHERE claim_number = $1',
        [claim_number]
      );
      
      if (claimResult.rows.length === 0) {
        console.log(`⚠️  Claim not found: ${claim_number}`);
        continue;
      }
      
      const claim = claimResult.rows[0];
      
      // Update the claimant with proper names and dates
      await client.query(
        `UPDATE claimants 
         SET first_name = $1, last_name = $2, date_of_birth = $3, updated_at = NOW()
         WHERE id = $4`,
        [firstName, lastName, date_of_birth, claim.claimant_id]
      );
      
      // Update the claim with proper date of injury
      await client.query(
        `UPDATE claims 
         SET date_of_injury = $1, updated_at = NOW()
         WHERE id = $2`,
        [date_of_injury, claim.id]
      );
      
      updatedCount++;
      
      if (i % 50 === 0) {
        console.log(`  ✅ Updated: ${firstName} ${lastName} - ${claim_number}`);
      }
    }
    
    console.log(`\n🎉 Data fix completed! Updated ${updatedCount} records.`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixImportedData()
    .then(() => {
      console.log('✅ Data fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixImportedData };
