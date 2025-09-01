const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 DATABASE OPERATIONS TEST: Testing database functions...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test the findOrCreateCustomer function
async function findOrCreateCustomer(customerName, pool) {
  if (!customerName || customerName.trim() === '') {
    return null;
  }
  
  try {
    console.log(`🔍 Looking for customer: "${customerName}"`);
    
    // First try to find existing customer
    const findResult = await pool.query(
      'SELECT id FROM customers WHERE name = $1 AND is_active = true',
      [customerName.trim()]
    );
    
    if (findResult.rows.length > 0) {
      console.log(`✅ Found existing customer: ${customerName}`);
      return findResult.rows[0].id;
    }
    
    console.log(`⚠️  Customer not found, would create: ${customerName}`);
    return null; // Don't actually create for this test
    
  } catch (error) {
    console.error(`❌ Error finding customer ${customerName}:`, error.message);
    return null;
  }
}

// Test the findBillingAccount function
async function findBillingAccount(billingAccountName, pool) {
  if (!billingAccountName || billingAccountName.trim() === '') {
    return null;
  }
  
  try {
    console.log(`🔍 Looking for billing account: "${billingAccountName}"`);
    
    const result = await pool.query(
      'SELECT id FROM billing_accounts WHERE name = $1 AND is_active = true',
      [billingAccountName.trim()]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Found billing account: ${billingAccountName}`);
      return result.rows[0].id;
    }
    
    console.log(`⚠️  Billing account not found: ${billingAccountName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error finding billing account ${billingAccountName}:`, error.message);
    return null;
  }
}

async function testDBOperations() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Database connected, testing operations...');
    
    // Test customer lookup
    console.log('\n📋 Testing customer lookup...');
    await findOrCreateCustomer('Caitlin Powell', client);
    await findOrCreateCustomer('Christine Boehme', client);
    
    // Test billing account lookup
    console.log('\n📋 Testing billing account lookup...');
    await findBillingAccount('The Zenith', client);
    
    console.log('\n🎉 DATABASE OPERATIONS TEST completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDBOperations();
