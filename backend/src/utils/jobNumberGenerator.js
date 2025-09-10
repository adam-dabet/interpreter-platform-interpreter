const db = require('../config/database');

/**
 * Generate a unique job number in format JOB-XXXXXX
 * @returns {Promise<string>} - Unique job number
 */
async function generateJobNumber() {
  try {
    // Get the highest existing job number
    const result = await db.query(`
      SELECT job_number 
      FROM jobs 
      WHERE job_number IS NOT NULL 
      AND job_number ~ '^JOB-[0-9]+$'
      ORDER BY CAST(SUBSTRING(job_number FROM 5) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastJobNumber = result.rows[0].job_number;
      const lastNumber = parseInt(lastJobNumber.substring(4)); // Extract number part
      nextNumber = lastNumber + 1;
    }
    
    // Format as JOB-XXXXXX (6 digits with leading zeros)
    const jobNumber = `JOB-${nextNumber.toString().padStart(6, '0')}`;
    
    // Double-check uniqueness (in case of race conditions)
    const checkResult = await db.query(
      'SELECT id FROM jobs WHERE job_number = $1',
      [jobNumber]
    );
    
    if (checkResult.rows.length > 0) {
      // If somehow it exists, try the next number
      return generateJobNumber();
    }
    
    return jobNumber;
  } catch (error) {
    console.error('Error generating job number:', error);
    // Fallback to timestamp-based number if there's an error
    const timestamp = Date.now().toString().slice(-6);
    return `JOB-${timestamp}`;
  }
}

/**
 * Generate a job number with retry logic for race conditions
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<string>} - Unique job number
 */
async function generateJobNumberWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const jobNumber = await generateJobNumber();
      return jobNumber;
    } catch (error) {
      console.warn(`Job number generation attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate unique job number after ${maxRetries} attempts`);
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
}

module.exports = {
  generateJobNumber,
  generateJobNumberWithRetry
};
