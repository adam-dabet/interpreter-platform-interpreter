const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateTemporaryPassword } = require('../utils/passwordGenerator');
const loggerService = require('./loggerService');

class UserService {
  /**
   * Create a user account for an approved interpreter
   * @param {Object} interpreterData - Interpreter profile data
   * @returns {Object} - Created user data with credentials
   */
  async createInterpreterUser(interpreterData) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [interpreterData.email]
      );
      
      let user;
      let tempPassword = null;
      
      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
      } else {
        // Generate credentials
        tempPassword = generateTemporaryPassword(12);
        const username = interpreterData.email; // Use email as username
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        
        // Create user account
        const userResult = await client.query(`
          INSERT INTO users (
            username, email, password, role, first_name, last_name, 
            phone, is_active, email_verified, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, username, email, first_name, last_name
        `, [
          username,
          interpreterData.email,
          hashedPassword,
          'provider', // Interpreter role
          interpreterData.first_name,
          interpreterData.last_name,
          interpreterData.phone || null,
          true, // is_active
          true  // email_verified (since they're approved)
        ]);
        
        user = userResult.rows[0];
      }
      
      // Link interpreter profile to user account
      const linkResult = await client.query(`
        UPDATE interpreters 
        SET user_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [user.id, interpreterData.id]);
      
      if (linkResult.rowCount === 0) {
        throw new Error(`Failed to link interpreter profile ${interpreterData.id} to user ${user.id}`);
      }
      
      await client.query('COMMIT');
      
      await loggerService.info('Interpreter user account created', {
        category: 'USER',
        interpreterId: interpreterData.id,
        userId: user.id,
        email: user.email
      });
      
      return {
        userId: user.id,
        username: user.username || interpreterData.email,
        email: user.email || interpreterData.email,
        tempPassword: tempPassword || 'Password already set',
        loginUrl: process.env.INTERPRETER_LOGIN_URL || 'http://localhost:3000/login'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      await loggerService.error('Failed to create interpreter user account', error, {
        category: 'USER',
        interpreterId: interpreterData.id,
        email: interpreterData.email
      });
      throw error;
    } finally {
      client.release();
    }
  }
  

  
  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object|null} - User data or null
   */
  async getUserByEmail(email) {
    try {
      const result = await db.query(
        'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      await loggerService.error('Failed to get user by email', error, {
        category: 'USER',
        email
      });
      throw error;
    }
  }
  
  /**
   * Update user's last login
   * @param {string} userId - User ID
   */
  async updateLastLogin(userId) {
    try {
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } catch (error) {
      await loggerService.error('Failed to update last login', error, {
        category: 'USER',
        userId
      });
    }
  }
}

module.exports = new UserService();
