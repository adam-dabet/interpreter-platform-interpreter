const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const customerController = require('../controllers/customerController');
const { authenticateCustomer } = require('../middleware/customerAuth');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
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
router.get('/appointments/:appointmentId/invoice', customerController.getInvoicePDF);

// Parametric data routes
router.get('/interpreter-types', customerController.getInterpreterTypes);
router.get('/languages', customerController.getLanguages);

// Claims routes
router.get('/claimants/:claimantId/claims', customerController.getClaimsForClaimant);

// Billing accounts and customers routes
router.get('/billing-accounts', customerController.getMyBillingAccounts);
router.get('/customers', customerController.getMyCustomers);

// Claimant management routes
router.post('/claimants', authenticateCustomer, customerController.createClaimant);
router.put('/claimants/:id', authenticateCustomer, customerController.updateClaimant);
router.delete('/claimants/:id', authenticateCustomer, customerController.deleteClaimant);

// Claim management routes
router.post('/claims', authenticateCustomer, customerController.createClaim);
router.put('/claims/:id', authenticateCustomer, customerController.updateClaim);
router.delete('/claims/:id', authenticateCustomer, customerController.deleteClaim);

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

// Edit appointment route (date, time, and duration)
router.put('/appointments/:appointmentId',
  authenticateCustomer,
  [
    body('appointmentDate')
      .optional()
      .isISO8601()
      .withMessage('Valid appointment date is required'),
                body('startTime')
                  .optional()
                  .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
                  .withMessage('Valid start time is required (HH:MM or HH:MM:SS format)'),
                body('endTime')
                  .optional()
                  .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
                  .withMessage('Valid end time is required (HH:MM or HH:MM:SS format)')
  ],
  handleValidationErrors,
  customerController.updateAppointment
);

// Cancel appointment route
router.post('/appointments/:appointmentId/cancel',
  authenticateCustomer,
  param('appointmentId').isUUID().withMessage('Valid appointment ID is required'),
  handleValidationErrors,
  customerController.cancelAppointment
);

// Simple appointment creation route (frontend format)
router.post('/appointments/simple',
  [
    body('appointmentDate')
      .isISO8601()
      .withMessage('Valid appointment date is required'),
    body('startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Valid start time is required (HH:MM format)'),
    body('endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Valid end time is required (HH:MM format)'),
    body('appointmentType')
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage('Appointment type is required and must be less than 100 characters'),
    body('claimantId')
      .isInt({ min: 1 })
      .withMessage('Valid claimant ID is required'),
    body('claimId')
      .isInt({ min: 1 })
      .withMessage('Valid claim ID is required'),
    body('serviceTypeId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid service type ID is required'),
    body('interpreterType')
      .notEmpty()
      .withMessage('Interpreter type is required'),
    body('doctorName')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Doctor name must be less than 255 characters'),
    body('employer')
      .optional()
      .isString()
      .withMessage('Employer must be a string'),
    body('examiner')
      .optional()
      .isString()
      .withMessage('Examiner must be a string'),
    body('isRemote')
      .optional()
      .isBoolean()
      .withMessage('isRemote must be a boolean')
  ],
  handleValidationErrors,
  customerController.createSimpleAppointment
);

module.exports = router;
