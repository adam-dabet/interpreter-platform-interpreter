const fs = require('fs');
const csv = require('csv-parser');

console.log('🔍 DEBUG: Checking CSV field names...');

const CSV_FILE_PATH = './scripts/zenith_claims_2023-08:31:2025.csv';

async function debugCSVFields() {
  try {
    console.log('📖 Reading CSV file...');
    
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
    
    if (allRows.length > 0) {
      console.log('\n🔍 First row field names:');
      const firstRow = allRows[0];
      Object.keys(firstRow).forEach((key, index) => {
        console.log(`  ${index + 1}. "${key}" = "${firstRow[key]}"`);
      });
      
      console.log('\n🔍 Sample data from first row:');
      console.log(`  DOB field: "${firstRow['DOB']}"`);
      console.log(`  DOI field: "${firstRow['DOI']}"`);
      console.log(`  Billing Account field: "${firstRow['Billing Account: Account Name']}"`);
      console.log(`  First Name field: "${firstRow['First Name']}"`);
      console.log(`  Last Name field: "${firstRow['Last Name']}"`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCSVFields();
