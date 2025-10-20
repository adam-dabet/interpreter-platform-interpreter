export const SERVICE_TYPES = [
    { value: 'medical', label: 'Medical', description: 'Hospitals, clinics, medical appointments' },
    { value: 'legal', label: 'Legal', description: 'Courts, law offices, legal consultations' },
    { value: 'phone', label: 'Phone', description: 'Remote interpretation via phone' },
    { value: 'document', label: 'Document', description: 'Written document translation services' },
    { value: 'other', label: 'Other', description: 'Other interpretation services' },
  ];
  
  export const EDUCATION_LEVELS = [
    { value: 'high_school', label: 'High School Diploma' },
    { value: 'associate', label: 'Associate Degree' },
    { value: 'bachelor', label: 'Bachelor\'s Degree' },
    { value: 'master', label: 'Master\'s Degree' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'professional', label: 'Professional Certification' },
  ];
  
  export const COMMON_LANGUAGES = [
    'Spanish', 'French', 'Mandarin', 'Portuguese', 'Arabic', 'Russian',
    'Japanese', 'Korean', 'German', 'Italian', 'Vietnamese', 'Hindi',
    'Tagalog', 'Polish', 'Dutch', 'Turkish', 'Farsi', 'Hebrew',
    'Thai', 'Ukrainian', 'Greek', 'Czech', 'Hungarian', 'Swedish'
  ];
  
  export const US_STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
  ];
  
  export const TAX_CLASSIFICATIONS = [
    { value: 'individual', label: 'Individual' },
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'llc', label: 'LLC' },
    { value: 'corporation', label: 'Corporation' },
  ];

export const RATE_UNITS = [
    { value: 'hours', label: 'per hour' },
    { value: 'minutes', label: 'per minute' },
    { value: 'word', label: 'per word' }
  ];
  
  export const DOCUMENT_TYPES = [
    {
      value: 'government_id',
      label: 'Government ID',
      description: 'Driver\'s license, passport, or state ID',
      required: true,
      acceptedFormats: '.jpg,.jpeg,.png,.pdf'
    },
    {
      value: 'certification',
      label: 'Professional Certification',
      description: 'Interpreter certification or license',
      required: true,
      acceptedFormats: '.jpg,.jpeg,.png,.pdf'
    },
    {
      value: 'w9_form',
      label: 'W-9 Tax Form',
      description: 'Completed and signed W-9 form',
      required: true,
      acceptedFormats: '.pdf'
    },
    {
      value: 'diploma',
      label: 'Education Diploma/Degree',
      description: 'High school diploma or college degree',
      required: false,
      acceptedFormats: '.jpg,.jpeg,.png,.pdf'
    },
    {
      value: 'transcript',
      label: 'Academic Transcript',
      description: 'Official academic transcripts',
      required: false,
      acceptedFormats: '.pdf'
    },
    {
      value: 'reference_letter',
      label: 'Reference Letter',
      description: 'Professional reference letters',
      required: false,
      acceptedFormats: '.jpg,.jpeg,.png,.pdf,.doc,.docx'
    }
  ];