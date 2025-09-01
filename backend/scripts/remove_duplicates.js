const { Pool } = require('pg');
require('dotenv').config();

console.log('🧹 REMOVING DUPLICATES: Cleaning up duplicate claimants and claims...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function removeDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding duplicates...');
    
    // First, let's see the current counts
    const initialCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM claimants WHERE is_active = true) as claimants_count,
        (SELECT COUNT(*) FROM claims WHERE is_active = true) as claims_count
    `);
    
    console.log(`📊 Initial counts:`);
    console.log(`  Claimants: ${initialCounts.rows[0].claimants_count}`);
    console.log(`  Claims: ${initialCounts.rows[0].claims_count}`);
    
    // Find duplicate claimants based on first_name, last_name, and claim_number
    const duplicateClaimants = await client.query(`
      WITH duplicate_groups AS (
        SELECT 
          c.first_name, 
          c.last_name, 
          cl.claim_number,
          COUNT(*) as count,
          MIN(c.id) as keep_id,
          ARRAY_AGG(c.id ORDER BY c.created_at) as all_ids
        FROM claimants c
        JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.is_active = true AND cl.is_active = true
        GROUP BY c.first_name, c.last_name, cl.claim_number
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_groups
      ORDER BY count DESC
    `);
    
    console.log(`\n🔍 Found ${duplicateClaimants.rows.length} groups of duplicates`);
    
    if (duplicateClaimants.rows.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    // Show some examples
    console.log('\n📋 Example duplicates:');
    duplicateClaimants.rows.slice(0, 5).forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.first_name} ${row.last_name} (${row.claim_number}) - ${row.count} duplicates`);
    });
    
    // Remove duplicate claims first (keep the oldest)
    console.log('\n🗑️  Removing duplicate claims...');
    let claimsDeleted = 0;
    
    for (const group of duplicateClaimants.rows) {
      const idsToDelete = group.all_ids.slice(1); // Keep the first (oldest), delete the rest
      
      for (const claimantId of idsToDelete) {
        // Delete claims for this claimant
        const claimsResult = await client.query(`
          UPDATE claims 
          SET is_active = false, updated_at = NOW()
          WHERE claimant_id = $1 AND is_active = true
        `, [claimantId]);
        
        claimsDeleted += claimsResult.rowCount;
      }
    }
    
    // Remove duplicate claimants (keep the oldest)
    console.log('🗑️  Removing duplicate claimants...');
    let claimantsDeleted = 0;
    
    for (const group of duplicateClaimants.rows) {
      const idsToDelete = group.all_ids.slice(1); // Keep the first (oldest), delete the rest
      
      for (const claimantId of idsToDelete) {
        // Delete the claimant
        const claimantResult = await client.query(`
          UPDATE claimants 
          SET is_active = false, updated_at = NOW()
          WHERE id = $1 AND is_active = true
        `, [claimantId]);
        
        claimantsDeleted += claimantResult.rowCount;
      }
    }
    
    // Get final counts
    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM claimants WHERE is_active = true) as claimants_count,
        (SELECT COUNT(*) FROM claims WHERE is_active = true) as claims_count
    `);
    
    console.log('\n✅ Duplicate removal completed!');
    console.log(`📊 Final counts:`);
    console.log(`  Claimants: ${finalCounts.rows[0].claimants_count} (removed ${claimantsDeleted})`);
    console.log(`  Claims: ${finalCounts.rows[0].claims_count} (removed ${claimsDeleted})`);
    
    // Verify no more duplicates
    const remainingDuplicates = await client.query(`
      WITH duplicate_groups AS (
        SELECT 
          c.first_name, 
          c.last_name, 
          cl.claim_number,
          COUNT(*) as count
        FROM claimants c
        JOIN claims cl ON c.id = cl.claimant_id
        WHERE c.is_active = true AND cl.is_active = true
        GROUP BY c.first_name, c.last_name, cl.claim_number
        HAVING COUNT(*) > 1
      )
      SELECT COUNT(*) as duplicate_count FROM duplicate_groups
    `);
    
    if (remainingDuplicates.rows[0].duplicate_count === 0) {
      console.log('✅ Verification passed: No more duplicates found!');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.rows[0].duplicate_count} duplicate groups still exist`);
    }
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the duplicate removal
if (require.main === module) {
  removeDuplicates()
    .then(() => {
      console.log('✅ Duplicate removal completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Duplicate removal failed:', error.message);
      process.exit(1);
    });
}

module.exports = { removeDuplicates };
