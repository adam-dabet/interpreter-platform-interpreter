const express = require('express');
const router = express.Router();
const jobStatusController = require('../controllers/jobStatusController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation middleware
const validateJobId = [
  param('jobId').isUUID().withMessage('Valid job ID is required')
];

const validateStatusTransition = [
  body('status').notEmpty().withMessage('Status is required'),
  body('reason').optional().isString(),
  body('notes').optional().isString()
];

const validateRejectJob = [
  body('reason').notEmpty().withMessage('Rejection reason is required')
];

// Generic status management routes
router.put('/jobs/:jobId/status', 
  authenticateToken, 
  ...validateJobId, 
  ...validateStatusTransition, 
  jobStatusController.transitionJobStatus
);

router.get('/jobs/:jobId/status/history', 
  authenticateToken, 
  ...validateJobId, 
  jobStatusController.getJobStatusHistory
);

router.get('/jobs/:jobId/status/transitions', 
  authenticateToken, 
  ...validateJobId, 
  jobStatusController.getValidTransitions
);

// Admin-specific status management routes
router.post('/admin/jobs/:jobId/approve', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.approveJob
);

router.post('/admin/jobs/:jobId/reject', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  ...validateRejectJob, 
  jobStatusController.rejectJob
);

router.post('/admin/jobs/:jobId/send-to-interpreters', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.sendToInterpreters
);

router.post('/admin/jobs/:jobId/send-reminders', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.sendReminders
);

router.post('/admin/jobs/:jobId/mark-billed', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  body('amount').optional().isNumeric(),
  jobStatusController.markAsBilled
);

router.post('/admin/jobs/:jobId/mark-closed', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.markAsClosed
);

router.post('/admin/jobs/:jobId/mark-interpreter-paid', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  body('amount').optional().isNumeric(),
  jobStatusController.markInterpreterPaid
);

// Statistics routes
router.get('/admin/status/statistics', 
  authenticateToken, 
  requireAdmin,
  jobStatusController.getStatusStatistics
);

module.exports = router;
