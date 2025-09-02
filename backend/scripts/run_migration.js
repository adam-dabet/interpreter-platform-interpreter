const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration: Add arrival_time and billing_account_id to jobs table');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_arrival_time_and_billing_account_to_jobs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL loaded');
    
    // Execute the migration
    await client.query('BEGIN');
    
    console.log('➕ Adding arrival_time column...');
    await client.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS arrival_time TIME');
    
    console.log('➕ Adding billing_account_id column...');
    await client.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_account_id INTEGER REFERENCES billing_accounts(id)');
    
    console.log('🔍 Creating index on billing_account_id...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_jobs_billing_account ON jobs(billing_account_id)');
    
    console.log('📝 Adding column comments...');
    await client.query(`
      COMMENT ON COLUMN jobs.arrival_time IS 'Time when interpreter should arrive at the location';
      COMMENT ON COLUMN jobs.billing_account_id IS 'Reference to the billing account for this job';
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'jobs' 
      AND column_name IN ('arrival_time', 'billing_account_id')
      ORDER BY column_name
    `);
    
    console.log('📋 New columns in jobs table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
