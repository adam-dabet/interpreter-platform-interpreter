const fs = require('fs');
const csv = require('csv-parser');

console.log('🧪 Simple CSV test starting...');

// Test with the fixed CSV file
const csvFile = './scripts/zenith_claims_fixed.csv';

console.log('📁 Checking if file exists...');
if (fs.existsSync(csvFile)) {
  console.log('✅ File exists');
} else {
  console.log('❌ File not found');
  process.exit(1);
}

console.log('📖 Reading CSV file...');
const results = [];
let rowCount = 0;

fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (data) => {
    rowCount++;
    if (rowCount <= 3) {
      console.log(`Row ${rowCount}:`, Object.keys(data));
    }
    results.push(data);
    if (rowCount >= 5) {
      console.log(`✅ Read ${rowCount} rows successfully`);
      process.exit(0);
    }
  })
  .on('end', () => {
    console.log(`✅ CSV reading completed. Total rows: ${results.length}`);
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV:', error.message);
    process.exit(1);
  });
