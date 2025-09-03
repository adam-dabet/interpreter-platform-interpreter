const jwt = require('jsonwebtoken');
const db = require('../config/database');
const loggerService = require('../services/loggerService');

/**
 * Middleware to authenticate customer tokens
 */
const authenticateCustomer = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'customer' || decoded.type !== 'session') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Verify customer still exists and is active
    const customerResult = await db.query(
      'SELECT id, name, email, is_active FROM customers WHERE id = $1',
      [decoded.customerId]
    );

    if (customerResult.rows.length === 0 || !customerResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or customer account disabled'
      });
    }

    // Verify session is still active
    const sessionResult = await db.query(`
      SELECT id, is_active, expires_at 
      FROM customer_sessions 
      WHERE customer_id = $1 AND token = $2 AND is_active = true
    `, [decoded.customerId, token]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    const session = sessionResult.rows[0];

    // Check if session has expired
    if (new Date() > new Date(session.expires_at)) {
      // Deactivate expired session
      await db.query(
        'UPDATE customer_sessions SET is_active = false WHERE id = $1',
        [session.id]
      );

      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    // Update last used timestamp
    await db.query(
      'UPDATE customer_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

    // Add customer info to request
    req.customer = customerResult.rows[0];
    req.sessionId = session.id;
    
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    await loggerService.error('Customer authentication error', error, {
      category: 'CUSTOMER_AUTH',
      token: token?.substring(0, 10) + '...'
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Optional customer authentication - doesn't fail if no token provided
 */
const optionalCustomerAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    await authenticateCustomer(req, res, next);
  } catch (error) {
    // Log the error but continue without authentication
    await loggerService.warn('Optional customer auth failed', {
      category: 'CUSTOMER_AUTH',
      error: error.message
    });
    next();
  }
};

module.exports = {
  authenticateCustomer,
  optionalCustomerAuth
};
