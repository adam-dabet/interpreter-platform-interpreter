const fs = require('fs');
const csv = require('csv-parser');

console.log('🧪 CSV ONLY TEST: Reading CSV without database operations...');

const CSV_FILE_PATH = './scripts/zenith_claims_fixed.csv';

async function testCSVOnly() {
  try {
    console.log('📖 Reading CSV...');
    const results = [];
    let shouldStop = false;
    
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(CSV_FILE_PATH);
      
      stream.pipe(csv())
        .on('data', (data) => {
          if (shouldStop) return;
          
          results.push(data);
          console.log(`📝 Read row ${results.length}: ${data['First Name']} ${data['Last Name']} (Claim: ${data['Claim_no']})`);
          
          if (results.length >= 5) { // Only read 5 rows
            console.log('🛑 Reached 5 rows, stopping...');
            shouldStop = true;
            stream.destroy();
            resolve();
          }
        })
        .on('end', () => {
          if (!shouldStop) {
            console.log(`✅ CSV reading completed. Found ${results.length} rows`);
            resolve();
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    console.log('🎯 CSV data summary:');
    results.forEach((row, index) => {
      console.log(`  Row ${index + 1}: ${row['First Name']} ${row['Last Name']} - ${row['Claim_no']}`);
    });
    
    console.log('\n🎉 CSV ONLY TEST completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCSVOnly();
