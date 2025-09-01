const { Pool } = require('pg');
require('dotenv').config();

console.log('🔗 MERGING DUPLICATE CLAIMANTS: Consolidating same people with multiple records...');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'interpreter_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function mergeDuplicateClaimants() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding duplicate claimants (same person, multiple records)...');
    
    // Find groups of claimants with the same name
    const duplicateGroups = await client.query(`
      WITH duplicate_groups AS (
        SELECT 
          first_name, 
          last_name,
          COUNT(*) as record_count,
          ARRAY_AGG(id ORDER BY created_at) as claimant_ids,
          MIN(id) as keep_id
        FROM claimants 
        WHERE is_active = true
        GROUP BY first_name, last_name
        HAVING COUNT(*) > 1
      )
      SELECT * FROM duplicate_groups
      ORDER BY record_count DESC
    `);
    
    console.log(`📊 Found ${duplicateGroups.rows.length} groups of duplicate claimants`);
    
    if (duplicateGroups.rows.length === 0) {
      console.log('✅ No duplicate claimants found!');
      return;
    }
    
    // Show some examples
    console.log('\n📋 Example duplicate groups:');
    duplicateGroups.rows.slice(0, 5).forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.first_name} ${group.last_name} - ${group.record_count} records`);
    });
    
    let totalMerged = 0;
    let totalClaimsMoved = 0;
    
    // Process each group
    for (const group of duplicateGroups.rows) {
      console.log(`\n🔄 Processing: ${group.first_name} ${group.last_name} (${group.record_count} records)`);
      
      const keepId = group.keep_id;
      const idsToMerge = group.claimant_ids.filter(id => id !== keepId);
      
      // Move all claims from duplicate claimants to the kept claimant
      for (const duplicateId of idsToMerge) {
        const claimsResult = await client.query(`
          UPDATE claims 
          SET claimant_id = $1, updated_at = NOW()
          WHERE claimant_id = $2 AND is_active = true
        `, [keepId, duplicateId]);
        
        totalClaimsMoved += claimsResult.rowCount;
        console.log(`  📄 Moved ${claimsResult.rowCount} claims from claimant ID ${duplicateId} to ${keepId}`);
      }
      
      // Delete the duplicate claimants (after moving their claims)
      for (const duplicateId of idsToMerge) {
        const deleteResult = await client.query(`
          UPDATE claimants 
          SET is_active = false, updated_at = NOW()
          WHERE id = $1 AND is_active = true
        `, [duplicateId]);
        
        if (deleteResult.rowCount > 0) {
          totalMerged += 1;
        }
      }
    }
    
    // Get final counts
    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM claimants WHERE is_active = true) as claimants_count,
        (SELECT COUNT(*) FROM claims WHERE is_active = true) as claims_count
    `);
    
    console.log('\n✅ Merge completed!');
    console.log(`📊 Results:`);
    console.log(`  Claimants merged: ${totalMerged}`);
    console.log(`  Claims moved: ${totalClaimsMoved}`);
    console.log(`  Final claimants: ${finalCounts.rows[0].claimants_count}`);
    console.log(`  Final claims: ${finalCounts.rows[0].claims_count}`);
    
    // Verify no more duplicate claimants
    const remainingDuplicates = await client.query(`
      SELECT COUNT(*) as duplicate_count
      FROM (
        SELECT first_name, last_name, COUNT(*) as record_count
        FROM claimants 
        WHERE is_active = true
        GROUP BY first_name, last_name
        HAVING COUNT(*) > 1
      ) duplicates
    `);
    
    if (remainingDuplicates.rows[0].duplicate_count === 0) {
      console.log('✅ Verification passed: No more duplicate claimants!');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.rows[0].duplicate_count} duplicate groups still exist`);
    }
    
    // Show some examples of the results
    console.log('\n📋 Example results:');
    const exampleResults = await client.query(`
      SELECT 
        c.first_name, 
        c.last_name, 
        COUNT(cl.id) as claim_count
      FROM claimants c
      LEFT JOIN claims cl ON c.id = cl.claimant_id AND cl.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(cl.id) > 1
      ORDER BY claim_count DESC
      LIMIT 5
    `);
    
    exampleResults.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.first_name} ${row.last_name} - ${row.claim_count} claims`);
    });
    
  } catch (error) {
    console.error('❌ Error merging duplicate claimants:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the merge
if (require.main === module) {
  mergeDuplicateClaimants()
    .then(() => {
      console.log('✅ Merge completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Merge failed:', error.message);
      process.exit(1);
    });
}

module.exports = { mergeDuplicateClaimants };
