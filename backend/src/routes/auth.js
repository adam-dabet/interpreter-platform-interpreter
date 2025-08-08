const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Login
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  authController.login
);

// Logout
router.post('/logout', authController.logout);

// Get profile (protected)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;