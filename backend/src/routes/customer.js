const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const customerController = require('../controllers/customerController');
const { authenticateCustomer } = require('../middleware/customerAuth');
const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Authentication routes (no auth required)
router.post('/auth/request-magic-link', 
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  handleValidationErrors,
  customerAuthController.requestMagicLink
);

router.post('/auth/verify-magic-link',
  [
    body('token')
      .notEmpty()
      .isLength({ min: 32, max: 128 })
      .withMessage('Valid token is required')
  ],
  handleValidationErrors,
  customerAuthController.verifyMagicLink
);

router.post('/auth/refresh-token',
  [
    body('refreshToken')
      .notEmpty()
      .isLength({ min: 32, max: 128 })
      .withMessage('Valid refresh token is required')
  ],
  handleValidationErrors,
  customerAuthController.refreshToken
);

// Protected routes (require authentication)
router.use(authenticateCustomer);

// Profile routes
router.get('/profile', customerController.getProfile || customerAuthController.getProfile);
router.post('/auth/logout', customerAuthController.logout);

// Customer data routes
router.get('/claimants', customerController.getMyClaimants);
router.get('/claims', customerController.getMyClaims);
router.get('/appointments', customerController.getMyAppointments);
router.get('/appointments/:appointmentId', customerController.getAppointmentDetails);

// Job request route
router.post('/appointments',
  [
    body('title')
      .notEmpty()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be between 3 and 255 characters'),
    body('scheduledDate')
      .isISO8601()
      .withMessage('Valid scheduled date is required'),
    body('scheduledTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Valid scheduled time is required (HH:MM format)'),
    body('claimantId')
      .isInt({ min: 1 })
      .withMessage('Valid claimant ID is required'),
    body('serviceTypeId')
      .isInt({ min: 1 })
      .withMessage('Valid service type ID is required'),
    body('estimatedDurationMinutes')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('isRemote')
      .optional()
      .isBoolean()
      .withMessage('isRemote must be a boolean'),
    body('appointmentType')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Appointment type must be less than 100 characters')
  ],
  handleValidationErrors,
  customerController.createJobRequest
);

module.exports = router;
