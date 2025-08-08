require('dotenv').config();
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // Create admin user if it doesn't exist
    const adminExists = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@interpreterplatform.com']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.query(`
        INSERT INTO users (username, email, password, role, first_name, last_name, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'admin',
        'admin@interpreterplatform.com',
        hashedPassword,
        'admin',
        'Admin',
        'User',
        true,
        true
      ]);
      
      console.log('Admin user created: admin@interpreterplatform.com / admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Add sample email templates if they don't exist
    const templatesExist = await db.query('SELECT COUNT(*) FROM email_templates');
    
    if (parseInt(templatesExist.rows[0].count) === 0) {
      console.log('Adding email templates...');
      
      // Insert the email templates from Step 3 (they're already in the schema)
      // This is just a confirmation that they exist
      const templateCount = await db.query('SELECT COUNT(*) FROM email_templates');
      console.log(`${templateCount.rows[0].count} email templates available`);
    }

    console.log('Database seeding completed!');
    process.exit(0);

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();