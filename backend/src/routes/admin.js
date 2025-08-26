const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
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

// Dashboard routes (protected)
router.get('/dashboard/stats', authenticateToken, adminController.getDashboardStats);

// Interpreter profile management routes (protected)
router.get('/profiles/pending', authenticateToken, adminController.getPendingProfiles);
router.get('/profiles', authenticateToken, adminController.getAllProfiles); // New route for all applications
router.get('/profiles/:profileId', authenticateToken, adminController.getProfileDetails);
router.put('/profiles/:profileId/status', 
  authenticateToken,
  [
    body('status').isIn(['draft', 'pending', 'under_review', 'approved', 'rejected', 'suspended']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.updateProfileStatus
);

// Specific approve/reject routes (protected)
router.post('/profiles/:profileId/approve', 
  authenticateToken,
  [
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.approveProfile
);
router.post('/profiles/:profileId/reject', 
  authenticateToken,
  [
    body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.rejectProfile
);

// Delete profile route (protected)
router.delete('/profiles/:profileId', authenticateToken, adminController.deleteProfile);

module.exports = router;