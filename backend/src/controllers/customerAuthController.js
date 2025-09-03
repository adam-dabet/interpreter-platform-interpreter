const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');
const loggerService = require('../services/loggerService');

class CustomerAuthController {
  /**
   * Request a magic link for customer login
   */
  async requestMagicLink(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Check if customer exists
      const customerResult = await db.query(
        'SELECT id, name, email, is_active FROM customers WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );

      if (customerResult.rows.length === 0) {
        // Don't reveal whether email exists or not for security
        return res.json({
          success: true,
          message: 'If your email is registered, you will receive a login link shortly.'
        });
      }

      const customer = customerResult.rows[0];

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store magic link in database
      await db.query(`
        INSERT INTO customer_magic_links (
          email, token, expires_at, requested_ip, requested_user_agent
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        email.toLowerCase(),
        token,
        expiresAt,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || ''
      ]);

      // Create magic link URL
      const magicLinkUrl = `${process.env.CUSTOMER_PORTAL_URL || 'http://localhost:3003'}/auth/verify?token=${token}`;

      // Send email with magic link
      try {
        await emailService.sendCustomerMagicLink({
          email: email,
          customer_name: customer.name,
          magic_link_url: magicLinkUrl,
          expires_in_minutes: 30
        });
      } catch (emailError) {
        // Log email error but don't fail the request for security
        await loggerService.warn('Failed to send magic link email', {
          category: 'CUSTOMER_AUTH',
          email: email,
          error: emailError.message
        });
      }

      await loggerService.info('Magic link requested', {
        category: 'CUSTOMER_AUTH',
        customerId: customer.id,
        email: email,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'If your email is registered, you will receive a login link shortly.'
      });

    } catch (error) {
      await loggerService.error('Magic link request failed', error, {
        category: 'CUSTOMER_AUTH',
        email: req.body.email
      });

      res.status(500).json({
        success: false,
        message: 'Failed to process login request'
      });
    }
  }

  /**
   * Verify magic link and create session
   */
  async verifyMagicLink(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      // Find and validate magic link
      const linkResult = await db.query(`
        SELECT ml.*, c.id as customer_id, c.name, c.email, c.is_active
        FROM customer_magic_links ml
        JOIN customers c ON ml.email = c.email
        WHERE ml.token = $1 
        AND ml.expires_at > CURRENT_TIMESTAMP 
        AND ml.is_used = false
        AND c.is_active = true
      `, [token]);

      if (linkResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired login link'
        });
      }

      const link = linkResult.rows[0];
      const customer = {
        id: link.customer_id,
        name: link.name,
        email: link.email,
        is_active: link.is_active
      };

      // Mark magic link as used
      await db.query(`
        UPDATE customer_magic_links 
        SET is_used = true, used_at = CURRENT_TIMESTAMP, 
            used_ip = $1, used_user_agent = $2
        WHERE id = $3
      `, [
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || '',
        link.id
      ]);

      // Create session token
      const sessionToken = jwt.sign(
        {
          customerId: customer.id,
          email: customer.email,
          role: 'customer',
          type: 'session'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Create refresh token
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Store session
      await db.query(`
        INSERT INTO customer_sessions (
          customer_id, token, refresh_token, expires_at, 
          ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        customer.id,
        sessionToken,
        refreshToken,
        sessionExpiresAt,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || ''
      ]);

      // Update customer login info
      await db.query(`
        UPDATE customers 
        SET last_login = CURRENT_TIMESTAMP, 
            login_count = login_count + 1,
            email_verified = true
        WHERE id = $1
      `, [customer.id]);

      await loggerService.info('Customer logged in successfully', {
        category: 'CUSTOMER_AUTH',
        customerId: customer.id,
        email: customer.email,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token: sessionToken,
          refreshToken: refreshToken,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          }
        }
      });

    } catch (error) {
      await loggerService.error('Magic link verification failed', error, {
        category: 'CUSTOMER_AUTH',
        token: req.body.token
      });

      res.status(500).json({
        success: false,
        message: 'Failed to verify login link'
      });
    }
  }

  /**
   * Refresh customer session token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Find active session
      const sessionResult = await db.query(`
        SELECT cs.*, c.id as customer_id, c.name, c.email
        FROM customer_sessions cs
        JOIN customers c ON cs.customer_id = c.id
        WHERE cs.refresh_token = $1 
        AND cs.expires_at > CURRENT_TIMESTAMP 
        AND cs.is_active = true
        AND c.is_active = true
      `, [refreshToken]);

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const session = sessionResult.rows[0];

      // Generate new session token
      const newSessionToken = jwt.sign(
        {
          customerId: session.customer_id,
          email: session.email,
          role: 'customer',
          type: 'session'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update session
      await db.query(`
        UPDATE customer_sessions 
        SET token = $1, last_used_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newSessionToken, session.id]);

      res.json({
        success: true,
        data: {
          token: newSessionToken,
          customer: {
            id: session.customer_id,
            name: session.name,
            email: session.email
          }
        }
      });

    } catch (error) {
      await loggerService.error('Token refresh failed', error, {
        category: 'CUSTOMER_AUTH'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  }

  /**
   * Logout customer and invalidate session
   */
  async logout(req, res) {
    try {
      const customerId = req.customer?.id;
      const authToken = req.headers.authorization?.split(' ')[1];

      if (customerId && authToken) {
        // Deactivate session
        await db.query(`
          UPDATE customer_sessions 
          SET is_active = false 
          WHERE customer_id = $1 AND token = $2
        `, [customerId, authToken]);

        await loggerService.info('Customer logged out', {
          category: 'CUSTOMER_AUTH',
          customerId: customerId
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      await loggerService.error('Logout failed', error, {
        category: 'CUSTOMER_AUTH'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
  }

  /**
   * Get current customer profile
   */
  async getProfile(req, res) {
    try {
      const customerId = req.customer.id;

      const customerResult = await db.query(`
        SELECT 
          id, name, email, phone, title, 
          email_verified, last_login, login_count,
          created_at
        FROM customers 
        WHERE id = $1 AND is_active = true
      `, [customerId]);

      if (customerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = customerResult.rows[0];

      res.json({
        success: true,
        data: customer
      });

    } catch (error) {
      await loggerService.error('Get customer profile failed', error, {
        category: 'CUSTOMER_AUTH',
        customerId: req.customer?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }
}

module.exports = new CustomerAuthController();
