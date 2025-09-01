const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 WORKING TEST: Starting import of 2 rows only...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const CSV_FILE_PATH = './scripts/zenith_claims_fixed.csv';

async function workingTest() {
  const client = await pool.connect();
  
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
          console.log(`📝 Read row ${results.length}: ${data['First Name']} ${data['Last Name']}`);
          
          if (results.length >= 2) {
            console.log('🛑 Reached 2 rows, stopping...');
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
    
    console.log('🎯 Processing rows...');
    
    // Process only the rows we collected
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      console.log(`\n📝 Processing row ${i + 1}: ${row['First Name']} ${row['Last Name']}`);
      
      // Just log the data, don't insert anything yet
      console.log(`  Claim #: ${row['Claim_no']}`);
      console.log(`  City: ${row['City']}`);
      console.log(`  Language: ${row['Language']}`);
    }
    
    console.log('\n🎉 WORKING TEST completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

workingTest();
