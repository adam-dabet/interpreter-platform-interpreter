const { Pool } = require('pg');
require('dotenv').config();

console.log('🔌 Testing database connection only...');

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
    console.log('📡 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`📅 Current database time: ${result.rows[0].current_time}`);
    
    client.release();
    await pool.end();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
