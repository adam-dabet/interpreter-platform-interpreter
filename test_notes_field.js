// Test script to verify notes field is working
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const testNotesField = async () => {
  console.log('=== Notes Field Test ===\n');

  try {
    // Test 1: Check if notes column exists
    console.log('1. Checking if notes column exists...');
    const columnCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'notes'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Notes column exists:', columnCheck.rows[0]);
    } else {
      console.log('❌ Notes column does not exist');
      return;
    }

    // Test 2: Test INSERT with notes
    console.log('\n2. Testing INSERT with notes...');
    const testJob = {
      title: 'Test Job with Notes',
      description: 'Test description',
      job_type: 'medical',
      priority: 'normal',
      status: 'scheduled',
      location_address: '123 Test St',
      location_city: 'Test City',
      location_state: 'CA',
      location_zip_code: '90210',
      scheduled_date: '2025-12-31',
      scheduled_time: '10:00',
      estimated_duration_minutes: 60,
      notes: 'This is a test note for the job'
    };

    const insertResult = await db.query(`
      INSERT INTO jobs (
        job_number, title, description, job_type, priority, status, 
        location_address, location_city, location_state, location_zip_code,
        scheduled_date, scheduled_time, estimated_duration_minutes, notes, created_by
      ) VALUES (
        'TEST-' || EXTRACT(EPOCH FROM NOW())::bigint, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1
      ) RETURNING id, title, notes
    `, [
      testJob.title, testJob.description, testJob.job_type, testJob.priority, testJob.status,
      testJob.location_address, testJob.location_city, testJob.location_state, testJob.location_zip_code,
      testJob.scheduled_date, testJob.scheduled_time, testJob.estimated_duration_minutes, testJob.notes
    ]);

    console.log('✅ Job created with notes:', insertResult.rows[0]);

    // Test 3: Test SELECT with notes
    console.log('\n3. Testing SELECT with notes...');
    const selectResult = await db.query(`
      SELECT id, title, notes FROM jobs WHERE id = $1
    `, [insertResult.rows[0].id]);

    console.log('✅ Job retrieved with notes:', selectResult.rows[0]);

    // Test 4: Test UPDATE with notes
    console.log('\n4. Testing UPDATE with notes...');
    const updateResult = await db.query(`
      UPDATE jobs SET notes = $1 WHERE id = $2 RETURNING id, title, notes
    `, ['Updated test note', insertResult.rows[0].id]);

    console.log('✅ Job updated with new notes:', updateResult.rows[0]);

    // Clean up test data
    await db.query('DELETE FROM jobs WHERE id = $1', [insertResult.rows[0].id]);
    console.log('\n🧹 Test data cleaned up');

    console.log('\n=== All Tests Passed ===');
    console.log('✅ Notes column exists in jobs table');
    console.log('✅ INSERT with notes works');
    console.log('✅ SELECT with notes works');
    console.log('✅ UPDATE with notes works');
    console.log('✅ Ready for invoice email integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
};

// Run the test
testNotesField();
