import * as yup from 'yup';

// Phone number regex (more flexible)
const phoneRegex = /^[\d\s\-()+.]{10,}$/;

// Personal Information Schema
export const personalInfoSchema = yup.object({
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(100, 'First name must be less than 100 characters'),
  
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(100, 'Last name must be less than 100 characters'),
  
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email address is required'),
  
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(phoneRegex, 'Please enter a valid phone number'),
  
  date_of_birth: yup
    .date()
    .nullable()
    .transform((value, originalValue) => {
      // Handle empty string as null
      if (!originalValue || originalValue === '') return null;
      return value;
    })
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('minimum-age', 'You must be at least 18 years old to apply', function(value) {
      if (!value) return true; // Optional field, skip validation if empty
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      return value <= eighteenYearsAgo;
    })
    .min(new Date('1930-01-01'), 'Please enter a valid date of birth'),
  
  business_name: yup
    .string()
    .max(255, 'Business name must be less than 255 characters'),

  sms_consent: yup
    .boolean()
    .oneOf([true], 'You must consent to receive text messages to continue'),

  });
  
  // Address Information Schema
  export const addressSchema = yup.object({
    street_address: yup
      .string()
      .required('Street address is required')
      .max(255, 'Address is too long'),
    
    street_address_2: yup
      .string()
      .max(255, 'Address is too long'),
    
    city: yup
      .string()
      .required('City is required')
      .max(100, 'City name is too long'),
    
    state_id: yup
      .string()
      .nullable(),
    
    zip_code: yup
      .string()
      .required('ZIP code is required')
      .matches(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  });
  
  // Professional Information Schema
export const professionalInfoSchema = yup.object({
  business_name: yup
    .string()
    .max(255, 'Business name is too long'),
  
  
  education_level: yup
    .string()
    .oneOf(['high_school', 'associate', 'bachelor', 'master', 'doctorate', 'professional'])
    .nullable(),
  
  bio: yup
    .string()
    .max(2000, 'Bio must be less than 2000 characters'),
  
  preferred_service_types: yup
    .array()
    .of(yup.string().oneOf(['medical', 'legal', 'phone', 'document', 'other']))
    .min(1, 'Please select at least one service type')
    .required('Service types are required'),
  
  service_rates: yup
    .array()
    .of(
      yup.object({
        service_type_id: yup.string().required('Service type is required'),
        rate_type: yup.string().oneOf(['platform', 'custom']).required('Rate type is required'),
        rate_amount: yup.mixed().when('rate_type', {
          is: 'custom',
          then: yup.number().required('Custom rate amount is required').min(0, 'Rate cannot be negative').max(1000, 'Rate cannot exceed $1000'),
          otherwise: yup.mixed().nullable()
        }),
        rate_unit: yup.string().when('rate_type', {
          is: 'custom',
          then: yup.string().oneOf(['minutes', 'hours']).required('Rate unit is required'),
          otherwise: yup.mixed().nullable()
        })
      })
    )
    .min(1, 'At least one service rate is required')
    .required('Service rates are required'),
  
  max_travel_distance: yup
    .number()
    .min(1, 'Travel distance must be at least 1 mile')
    .max(100, 'Travel distance cannot exceed 100 miles')
    .default(25),
  

  
  willing_to_work_weekends: yup.boolean().default(false),
  willing_to_work_evenings: yup.boolean().default(false),
  
  emergency_contact_name: yup
    .string()
    .required('Emergency contact name is required')
    .max(255, 'Name is too long'),
  
  emergency_contact_phone: yup
    .string()
    .required('Emergency contact phone is required')
    .matches(phoneRegex, 'Please enter a valid phone number'),
  
  emergency_contact_relationship: yup
    .string()
    .required('Emergency contact relationship is required')
    .max(100, 'Relationship description is too long'),
  
  ssn_last_four: yup
    .string()
    .required('Last 4 digits of SSN are required')
    .matches(/^\d{4}$/, 'Must be exactly 4 digits'),
  
  tax_classification: yup
    .string()
    .oneOf(['individual', 'sole_proprietorship', 'llc', 'corporation'])
    .default('individual'),
});

// Languages Schema
export const languagesSchema = yup.object({
  languages: yup
    .array()
    .of(
      yup.object({
        language_id: yup.string().required('Language is required'),
        is_native: yup.boolean().default(false)
      })
    )
    .min(1, 'Please add at least one language')
    .required('Languages are required'),
});

// Terms and Agreements Schema
export const agreementsSchema = yup.object({
  terms_accepted: yup
    .boolean()
    .oneOf([true], 'You must accept the terms and conditions'),
  
  privacy_policy_accepted: yup
    .boolean()
    .oneOf([true], 'You must accept the privacy policy'),
  
  w9_entry_method: yup
    .string()
    .oneOf(['upload', 'manual'], 'Please select an entry method')
    .required('W-9 entry method is required'),
  
  w9_file: yup
    .mixed()
    .when('w9_entry_method', {
      is: 'upload',
      then: yup.mixed().required('W-9 form file is required')
    }),
  
  w9_data: yup
    .object()
    .when('w9_entry_method', {
      is: 'manual',
      then: yup.object({
        business_name: yup.string().required('Business name is required'),
        tax_classification: yup.string().required('Tax classification is required'),
        ssn: yup.string().test(
          'ssn-or-ein-required',
          'Either SSN or EIN is required',
          function(value) {
            const { ein } = this.parent;
            const hasSSN = value && /^\d{3}-\d{2}-\d{4}$/.test(value);
            const hasEIN = ein && /^\d{2}-\d{7}$/.test(ein);
            return hasSSN || hasEIN;
          }
        ).test(
          'ssn-format',
          'SSN must be in format XXX-XX-XXXX',
          function(value) {
            if (!value) return true; // Format validation only if value exists
            return /^\d{3}-\d{2}-\d{4}$/.test(value);
          }
        ),
        ein: yup.string().test(
          'ein-format',
          'EIN must be in format XX-XXXXXXX',
          function(value) {
            if (!value) return true; // Format validation only if value exists
            return /^\d{2}-\d{7}$/.test(value);
          }
        ),
        address: yup.string().required('Address is required'),
        city: yup.string().required('City is required'),
        state: yup.string().required('State is required'),
        zip_code: yup.string().required('ZIP code is required')
      })
    }),
});

// Combined schema for final validation
export const completeApplicationSchema = personalInfoSchema
  .concat(professionalInfoSchema)
  .concat(languagesSchema)
  .concat(agreementsSchema);