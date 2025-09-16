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
  (req, res) => jobStatusController.transitionJobStatus(req, res)
);

router.get('/jobs/:jobId/status/history', 
  authenticateToken, 
  ...validateJobId, 
  jobStatusController.getJobStatusHistory.bind(jobStatusController)
);

router.get('/jobs/:jobId/status/transitions', 
  authenticateToken, 
  ...validateJobId, 
  jobStatusController.getValidTransitions.bind(jobStatusController)
);

// Admin-specific status management routes
router.post('/admin/jobs/:jobId/approve', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.approveJob.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/reject', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  ...validateRejectJob, 
  jobStatusController.rejectJob.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/send-to-interpreters', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.sendToInterpreters.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/send-reminders', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.sendReminders.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/mark-billed', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  body('amount').optional().isNumeric(),
  jobStatusController.markAsBilled.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/mark-closed', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  jobStatusController.markAsClosed.bind(jobStatusController)
);

router.post('/admin/jobs/:jobId/mark-interpreter-paid', 
  authenticateToken, 
  requireAdmin,
  ...validateJobId, 
  body('amount').optional().isNumeric(),
  jobStatusController.markInterpreterPaid.bind(jobStatusController)
);

// Statistics routes
router.get('/admin/status/statistics', 
  authenticateToken, 
  requireAdmin,
  jobStatusController.getStatusStatistics.bind(jobStatusController)
);

module.exports = router;
