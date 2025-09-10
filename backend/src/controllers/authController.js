const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find admin user
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2 AND is_active = true',
        [email, 'admin']
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async logout(req, res) {
    // In a more complex setup, you might blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  async interpreterLogin(req, res) {
    try {
      const { email, password } = req.body;

      // Find interpreter user
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2 AND is_active = true',
        [email, 'provider']
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or account not found'
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Get interpreter profile
      const interpreterResult = await db.query(
        'SELECT * FROM interpreters WHERE user_id = $1',
        [user.id]
      );

      const interpreterProfile = interpreterResult.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          interpreterId: interpreterProfile?.id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            username: user.username,
            passwordChanged: user.password_changed
          },
          interpreterProfile: interpreterProfile ? {
            id: interpreterProfile.id,
            profileStatus: interpreterProfile.profile_status,
            verificationStatus: interpreterProfile.verification_status
          } : null,
          requiresPasswordChange: !user.password_changed
        }
      });

    } catch (error) {
      console.error('Interpreter login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const result = await db.query(
        'SELECT id, email, first_name, last_name, role, last_login FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Enhanced password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }
      
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
        });
      }
      
      // Check if new password is too similar to current password
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from your current password'
        });
      }

      // Get current user
      const userResult = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and set password_changed flag
      await db.query(
        'UPDATE users SET password = $1, password_changed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedNewPassword, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();