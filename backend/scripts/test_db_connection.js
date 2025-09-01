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

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`📅 Current database time: ${result.rows[0].current_time}`);
    
    // Check if required tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('claimants', 'claims', 'customers', 'billing_accounts')
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check claimants table structure
    const claimantsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'claimants'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏗️  Claimants table structure:');
    claimantsStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };
