const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const jobController = require('../controllers/jobController');
const jobAssignmentController = require('../controllers/jobAssignmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schemas
const jobValidation = [
  body('jobNumber').notEmpty().withMessage('Job number is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time is required'),
  body('appointmentType').isIn([
    'acupuncture', 'ame', 'aoe_coe', 'benefit_meeting', 'cardiac_evaluation', 'chiropractor',
    'consult_telehealth', 'consult_treat', 'consultation', 'ct_scan', 'dentist', 'deposition',
    'deposition_zoom', 'diagnostic_testing', 'ekg', 'emg', 'employee_meeting', 'epidural_injection',
    'equipment_explination', 'evaluation', 'follow_up', 'follow_up_telehealth', 'follow_up_lab_work',
    'follow_up_pt', 'functional_capacity', 'hearing_loss', 'hernia_consult', 'ime', 'initial_appointment',
    'injection', 'injection_steroid', 'internal_medicine', 'interview', 'interview_witness',
    'laser_procedure', 'legal', 'medical', 'medical_telehealth', 'medical_clerance', 'medical_procedure',
    'mri', 'ncm_meeting', 'occupational', 'one_time_appointment', 'orthopaedic', 'pain_management',
    'physical_therapy', 'physical_therapy_initial', 'psychological', 'qme', 'recorded_statement',
    'second_opinion', 'settlement_documents', 'status_conference', 'status_conference_remote',
    'surgery', 'surgery_check_in', 'surgery_discharge', 'surgery_post_op', 'surgery_pre_op',
    'surgical_consult', 'trial', 'vocational_evaluation', 'x_ray', 'mandatory_settlement_agreement',
    'hearing', 'mandatory_settlement_conference', 'permanent_stationary', 'cognitive_behavioral_therapy'
  ]).withMessage('Invalid appointment type'),
  body('reserveTime').isInt({ min: 15, max: 480 }).withMessage('Reserve time must be between 15 and 480 minutes'),
  body('serviceType').notEmpty().withMessage('Service type is required'),
  body('language').notEmpty().withMessage('Language is required'),
  body('interpreterType').notEmpty().withMessage('Interpreter type is required'),
  body('claimantId').notEmpty().withMessage('Claimant is required'),
  body('claimId').notEmpty().withMessage('Claim is required'),
  body('locationOfService').notEmpty().withMessage('Location of service is required')
];

const jobUpdateValidation = [
  body('title').optional().notEmpty().withMessage('Job title cannot be empty'),
  body('job_type').optional().isIn(['medical', 'legal', 'business', 'education', 'social_services', 'emergency', 'other']).withMessage('Invalid job type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('status').optional().isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status'),
  body('scheduled_date').optional().isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduled_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid scheduled time is required'),
  body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('total_amount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('client_email').optional().isEmail().withMessage('Valid client email is required'),
  // Frontend field validations
  body('appointmentType').optional().isIn([
    'acupuncture', 'ame', 'aoe_coe', 'benefit_meeting', 'cardiac_evaluation', 'chiropractor',
    'consult_telehealth', 'consult_treat', 'consultation', 'ct_scan', 'dentist', 'deposition',
    'deposition_zoom', 'diagnostic_testing', 'ekg', 'emg', 'employee_meeting', 'epidural_injection',
    'equipment_explination', 'evaluation', 'follow_up', 'follow_up_telehealth', 'follow_up_lab_work',
    'follow_up_pt', 'functional_capacity', 'hearing_loss', 'hernia_consult', 'ime', 'initial_appointment',
    'injection', 'injection_steroid', 'internal_medicine', 'interview', 'interview_witness',
    'laser_procedure', 'legal', 'medical', 'medical_telehealth', 'medical_clerance', 'medical_procedure',
    'mri', 'ncm_meeting', 'occupational', 'one_time_appointment', 'orthopaedic', 'pain_management',
    'physical_therapy', 'physical_therapy_initial', 'psychological', 'qme', 'recorded_statement',
    'second_opinion', 'settlement_documents', 'status_conference', 'status_conference_remote',
    'surgery', 'surgery_check_in', 'surgery_discharge', 'surgery_post_op', 'surgery_pre_op',
    'surgical_consult', 'trial', 'vocational_evaluation', 'x_ray', 'mandatory_settlement_agreement',
    'hearing', 'mandatory_settlement_conference', 'permanent_stationary', 'cognitive_behavioral_therapy'
  ]).withMessage('Invalid appointment type'),
  body('interpreterType').optional().isUUID().withMessage('Valid interpreter type ID is required'),
  body('jobNumber').optional().notEmpty().withMessage('Job number cannot be empty'),
  body('appointmentDate').optional().isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time is required'),
  body('reserveTime').optional().isInt({ min: 15, max: 480 }).withMessage('Reserve time must be between 15 and 480 minutes'),
  body('serviceType').optional().notEmpty().withMessage('Service type is required'),
  body('language').optional().notEmpty().withMessage('Language is required'),
  body('claimantId').optional().notEmpty().withMessage('Claimant cannot be empty'),
  body('claimId').optional().notEmpty().withMessage('Claim cannot be empty'),
  body('locationOfService').optional().notEmpty().withMessage('Location of service cannot be empty')
];

const assignmentValidation = [
  body('agreed_rate').optional().isFloat({ min: 0 }).withMessage('Agreed rate must be a positive number'),
  body('declined_reason').optional().isLength({ max: 500 }).withMessage('Decline reason must be less than 500 characters'),
  body('actual_hours').optional().isFloat({ min: 0.1, max: 24 }).withMessage('Actual hours must be between 0.1 and 24'),
  body('interpreter_id').optional().isInt({ min: 1 }).withMessage('Valid interpreter ID is required'),
  body('agreed_rate').optional().isFloat({ min: 0 }).withMessage('Agreed rate must be a positive number')
];

// Public routes (for interpreters to browse available jobs)
router.get('/available', 
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('language').optional().isLength({ min: 2, max: 10 }).withMessage('Language code must be 2-10 characters'),
  query('service_type').optional().isLength({ min: 2, max: 50 }).withMessage('Service type must be 2-50 characters'),
  query('location').optional().isLength({ min: 2, max: 100 }).withMessage('Location must be 2-100 characters'),
  query('date_from').optional().isISO8601().withMessage('Valid date is required'),
  query('date_to').optional().isISO8601().withMessage('Valid date is required'),
  query('remote_only').optional().isIn(['true', 'false']).withMessage('Remote only must be true or false'),
  jobController.getAvailableJobs
);

// Interpreter routes (require authentication)
router.get('/my-jobs', 
  authenticateToken,
  requireRole('provider'),
  query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  jobController.getInterpreterJobs
);

router.get('/earnings',
  authenticateToken,
  requireRole('provider'),
  query('period').optional().isIn(['all', 'month', 'week']).withMessage('Period must be all, month, or week'),
  jobAssignmentController.getInterpreterEarnings
);

// Job assignment routes (interpreter actions)
router.post('/:jobId/accept',
  authenticateToken,
  requireRole('provider'),
  param('jobId').isUUID().withMessage('Valid job ID is required'),
  assignmentValidation,
  jobAssignmentController.acceptJob
);

router.post('/:jobId/decline',
  authenticateToken,
  requireRole('provider'),
  param('jobId').isUUID().withMessage('Valid job ID is required'),
  assignmentValidation,
  jobAssignmentController.declineJob
);

// Admin routes (require admin authentication)
router.get('/',
  authenticateToken,
  requireRole('admin'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  query('date_from').optional().isISO8601().withMessage('Valid date is required'),
  query('date_to').optional().isISO8601().withMessage('Valid date is required'),
  jobController.getAllJobs
);

router.get('/stats',
  authenticateToken,
  requireRole('admin'),
  jobController.getJobStats
);

router.post('/',
  authenticateToken,
  requireRole('admin'),
  jobValidation,
  jobController.createJob
);

router.get('/:id',
  authenticateToken,
  param('id').isUUID().withMessage('Valid job ID is required'),
  jobController.getJobById
);

router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid job ID is required'),
  jobUpdateValidation,
  jobController.updateJob
);

router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid job ID is required'),
  jobController.deleteJob
);

// Admin assignment routes
router.post('/:jobId/assign',
  authenticateToken,
  requireRole('admin'),
  param('jobId').isUUID().withMessage('Valid job ID is required'),
  assignmentValidation,
  jobAssignmentController.assignJobToInterpreter
);

router.get('/:jobId/assignments',
  authenticateToken,
  requireRole('admin'),
  param('jobId').isUUID().withMessage('Valid job ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  jobAssignmentController.getJobAssignments
);

module.exports = router;

