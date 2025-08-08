const { body, param } = require('express-validator');

const applicationValidation = [
  body('first_name')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10-20 characters')
    .matches(/^[\d\s\-\(\)\+\.]+$/)
    .withMessage('Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign'),



  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Valid date of birth is required'),
  
  body('address_line1')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 255 })
    .withMessage('Address too long'),
  
  body('city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City name too long'),
  
  body('state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Valid state is required'),
  
  body('zip_code')
    .notEmpty()
    .withMessage('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Valid ZIP code is required'),
  
  body('years_of_experience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Years of experience must be between 0 and 50'),
  
  body('hourly_rate')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Hourly rate must be a valid decimal number'),
  
  body('preferred_service_types')
    .isArray({ min: 1 })
    .withMessage('At least one service type must be selected')
    .custom((value) => {
      const validTypes = ['medical', 'legal', 'phone', 'document', 'other'];
      return value.every(type => validTypes.includes(type));
    })
    .withMessage('Invalid service type selected'),
  
  body('emergency_contact_name')
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  
  body('emergency_contact_phone')
    .notEmpty()
    .withMessage('Emergency contact phone is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Emergency contact phone must be between 10-20 characters')
    .matches(/^[\d\s\-\(\)\+\.]+$/)
    .withMessage('Emergency contact phone can only contain digits, spaces, hyphens, parentheses, and plus sign'),
  
  body('emergency_contact_relationship')
    .notEmpty()
    .withMessage('Emergency contact relationship is required'),
  
  body('ssn_last_four')
    .matches(/^\d{4}$/)
    .withMessage('Last 4 digits of SSN must be exactly 4 digits'),
  
  body('languages')
    .isArray({ min: 1 })
    .withMessage('At least one language must be specified')
    .custom((languages) => {
      return languages.every(lang => 
        lang.name && 
        lang.proficiency && 
        ['beginner', 'intermediate', 'advanced', 'native', 'certified_native'].includes(lang.proficiency) &&
        typeof lang.years_experience === 'number' &&
        lang.years_experience >= 0
      );
    })
    .withMessage('Invalid language or proficiency level'),
  
  body('terms_accepted')
    .equals('true')
    .withMessage('Terms and conditions must be accepted'),
  
  body('privacy_policy_accepted')
    .equals('true')
    .withMessage('Privacy policy must be accepted'),
  
  body('w9_entry_method')
    .isIn(['upload', 'manual'])
    .withMessage('W-9 entry method must be either upload or manual'),
  
  body('w9_file')
    .optional()
    .custom((value, { req }) => {
      if (req.body.w9_entry_method === 'upload' && !value) {
        throw new Error('W-9 form file is required when using upload method');
      }
      return true;
    }),
  
  body('w9_data')
    .optional()
    .custom((value, { req }) => {
      if (req.body.w9_entry_method === 'manual') {
        if (!value || !value.business_name || !value.tax_classification) {
          throw new Error('W-9 data is required when using manual method');
        }
      }
      return true;
    })
];

const documentUploadValidation = [
  body('document_type')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['government_id', 'certification', 'diploma', 'transcript', 'w9_form', 'background_check', 'reference_letter', 'portfolio', 'other'])
    .withMessage('Invalid document type'),
  
  body('document_name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Document name too long')
];

const applicationIdValidation = [
  param('applicationId')
    .isUUID()
    .withMessage('Valid application ID is required')
];

module.exports = {
  applicationValidation,
  documentUploadValidation,
  applicationIdValidation
};