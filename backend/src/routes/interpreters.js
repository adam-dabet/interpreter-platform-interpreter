const express = require('express');
const router = express.Router();
const interpreterController = require('../controllers/interpreterController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { fileUploadLogger } = require('../middleware/logging');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/interpreter-documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Allow common document formats
        const allowedTypes = /\.(pdf|jpg|jpeg|png|doc|docx)$/i;
        if (allowedTypes.test(path.extname(file.originalname))) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed'));
        }
    }
});

// Validation rules for interpreter profile
const interpreterValidation = [
    body('first_name').trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('last_name').trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').isMobilePhone(),
    body('date_of_birth').optional().isDate(),
    body('street_address').trim().notEmpty().isLength({ min: 1, max: 255 }),
    body('city').trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('state_id').isInt({ min: 1 }),
    body('zip_code').matches(/^\d{5}(-\d{4})?$/),
    body('years_of_experience').optional().isInt({ min: 0, max: 50 }),
    body('hourly_rate').optional().isDecimal({ decimal_digits: '0,2' }),
    body('languages').custom((value) => {
        // Handle both string and array formats
        let languages;
        if (typeof value === 'string') {
            try {
                languages = JSON.parse(value);
            } catch (e) {
                throw new Error('Invalid languages format');
            }
        } else {
            languages = value;
        }
        
        if (!Array.isArray(languages) || languages.length === 0) {
            throw new Error('At least one language is required');
        }
        
        // Validate that each language has required fields and UUID format
        for (const lang of languages) {
            if (!lang.language_id || !lang.proficiency_level) {
                throw new Error('Each language must have language_id and proficiency_level');
            }
            // Basic UUID format check
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lang.language_id)) {
                throw new Error('language_id must be a valid UUID');
            }
        }
        
        return true;
    }),
    body('service_types').custom((value) => {
        // Handle both string and array formats
        let serviceTypes;
        if (typeof value === 'string') {
            try {
                serviceTypes = JSON.parse(value);
            } catch (e) {
                throw new Error('Invalid service types format');
            }
        } else {
            serviceTypes = value;
        }
        
        if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
            throw new Error('At least one service type is required');
        }
        
        // Validate that each service type is a valid integer (service_types table uses integer IDs)
        for (const serviceTypeId of serviceTypes) {
            const parsedId = parseInt(serviceTypeId);
            const isValidInteger = Number.isInteger(parsedId) && parsedId > 0;
            
            if (!isValidInteger) {
                throw new Error('Each service_type must be a valid positive integer');
            }
        }
        
        return true;
    })
];

// Create interpreter profile
router.post('/', upload.array('certificates', 10), interpreterValidation, fileUploadLogger, interpreterController.createProfile);

// Get interpreter profile by ID
router.get('/:id', interpreterController.getProfile);

// Update interpreter profile
router.put('/:id', upload.array('certificates', 10), interpreterValidation, fileUploadLogger, interpreterController.updateProfile);

// Get all interpreter profiles (with pagination and filtering)
router.get('/', interpreterController.getAllProfiles);

module.exports = router;