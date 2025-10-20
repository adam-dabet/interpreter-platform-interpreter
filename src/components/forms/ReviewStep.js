import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import LoadingSpinner from '../ui/LoadingSpinner';
import { SERVICE_TYPES, EDUCATION_LEVELS, US_STATES } from '../../utils/constants';

const ReviewStep = ({ data, onPrevious, onSubmit, isSubmitting, onEdit, parametricData }) => {
  const [agreements, setAgreements] = useState({
    terms_accepted: data.terms_accepted || false,
    privacy_policy_accepted: data.privacy_policy_accepted || false,
  });

  const [errors, setErrors] = useState({});

  // Debug logging
  console.log('ReviewStep - parametricData:', parametricData);
  console.log('ReviewStep - data:', data);
  console.log('ReviewStep - languages:', parametricData?.languages);
  console.log('ReviewStep - usStates:', parametricData?.usStates);
  console.log('ReviewStep - serviceTypes:', parametricData?.serviceTypes);

  const validateAgreements = () => {
    const newErrors = {};
    
    if (!agreements.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the terms and conditions';
    }
    if (!agreements.privacy_policy_accepted) {
      newErrors.privacy_policy_accepted = 'You must accept the privacy policy';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateAgreements()) {
      const finalData = { ...data, ...agreements };
      onSubmit(finalData);
    }
  };

  const getServiceTypeLabel = (value) => {
    return SERVICE_TYPES.find(type => type.value === value)?.label || value;
  };

  const getEducationLabel = (value) => {
    return EDUCATION_LEVELS.find(level => level.value === value)?.label || value;
  };

  const getStateLabel = (value) => {
    if (!value) return '';
    // Handle both string and numeric state IDs
    const state = US_STATES.find(state => state.value === value || state.value === parseInt(value));
    return state?.label || value;
  };

  const getCertificateTypeName = (typeId) => {
    // Use parametric data if available
    if (parametricData?.certificateTypes && typeId) {
      const certType = parametricData.certificateTypes.find(ct => 
        ct.id === typeId || 
        ct.id === parseInt(typeId) ||
        String(ct.id) === String(typeId)
      );
      if (certType) return certType.name;
    }
    
    // Fallback mapping
    const certificateTypes = {
      1: 'State Court Certification',
      2: 'Medical Interpreter Certification',
      3: 'Administrative Court Certification',
      4: 'CHI Certification',
      5: 'NBCMI Certification',
      6: 'Federal Court Certification',
      7: 'Language Proficiency Certificate',
      8: 'Business License',
      9: 'Professional Liability Insurance',
      10: 'Insurance',
      21: 'W-9 Tax Form',
      23: 'Medical Certification'
    };
    return certificateTypes[parseInt(typeId)] || certificateTypes[typeId] || 'Unknown Certificate Type';
  };

  const getLanguageName = (languageId) => {
    if (parametricData?.languages && languageId) {
      // Handle both UUID strings and integer IDs
      const language = parametricData.languages.find(l => 
        l.id === languageId || 
        l.id === parseInt(languageId) ||
        String(l.id) === String(languageId)
      );
      if (language) return language.name;
    }
    return 'Unknown Language';
  };

  const getServiceTypeName = (serviceTypeId) => {
    if (parametricData?.serviceTypes && serviceTypeId) {
      // Handle both string and integer IDs
      const serviceType = parametricData.serviceTypes.find(st => 
        st.id === serviceTypeId || 
        st.id === parseInt(serviceTypeId) ||
        String(st.id) === String(serviceTypeId)
      );
      if (serviceType) return serviceType.name;
    }
    return 'Unknown Service Type';
  };

  const getStateName = (stateId) => {
    if (!stateId) return 'Unknown State';
    
    if (parametricData?.usStates) {
      // Handle both string and integer IDs, and state codes
      const state = parametricData.usStates.find(s => 
        s.id === stateId || 
        s.id === parseInt(stateId) ||
        String(s.id) === String(stateId) ||
        s.code === stateId ||
        s.abbreviation === stateId
      );
      if (state) return state.name;
    }
    
    // Fallback to US_STATES constant (handles 2-letter state codes like "CA", "NY")
    const stateFromConstant = US_STATES.find(s => 
      s.value === stateId || 
      s.value === String(stateId) ||
      s.label === stateId
    );
    if (stateFromConstant) return stateFromConstant.label;
    
    return getStateLabel(stateId) || stateId || 'Unknown State';
  };

  const formatDocumentCount = (documents) => {
    if (!documents) return 0;
    // Handle both array and object formats
    if (Array.isArray(documents)) {
      return documents.length;
    }
    return Object.values(documents).reduce((total, files) => total + (files?.length || 0), 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
        <p className="text-gray-600">
          Please review your information before submitting your application.
        </p>
      </div>

      {/* Application Summary */}
      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            <button 
              onClick={() => onEdit && onEdit(1)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <span className="ml-2">{data.first_name} {data.last_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <span className="ml-2">{data.email}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <span className="ml-2">{data.phone}</span>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
            <button 
              onClick={() => onEdit && onEdit(2)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Address:</span>
              <span className="ml-2">
                {data.formatted_address || data.street_address || 'Address not provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Languages</h3>
            <button 
              onClick={() => onEdit && onEdit(3)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            {data.languages && data.languages.length > 0 ? (
              data.languages.map((language, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-medium text-gray-900">
                      {language.name || language.language_name || getLanguageName(language.language_id)}
                    </span>
                    {language.is_native && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Native
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No languages specified</p>
            )}
          </div>
        </div>

        {/* Service Types */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Service Types & Rates</h3>
            <button 
              onClick={() => onEdit && onEdit(5)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Selected Service Types:</span>
              <div className="ml-2 mt-2 flex flex-wrap gap-2">
                {data.service_types && data.service_types.length > 0 ? (
                  data.service_types.map((typeId, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {getServiceTypeName(typeId)}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No service types selected</span>
                )}
              </div>
            </div>
            
            {data.service_rates && data.service_rates.length > 0 && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Service Rates:</span>
                <div className="mt-2 space-y-2">
                  {data.service_rates.map((rate, index) => {
                    const serviceName = getServiceTypeName(rate.service_type_id);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="font-medium text-gray-900">{serviceName}</span>
                        <span className="text-sm text-gray-600">
                          {rate.rate_type === 'platform' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Platform Rate: ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : 'hr'}</span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Custom Rate: ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : 'hr'}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Certification Status</h3>
            <button 
              onClick={() => onEdit && onEdit(4)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-700">
                {data.is_certified === true ? 'Certified Interpreter' : 'Not Certified'}
              </span>
            </div>
            
            {data.is_certified === true && data.certificates && data.certificates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Certifications:</p>
                {data.certificates.map((cert, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-600">{getCertificateTypeName(cert.certificate_type_id)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Number:</span>
                        <span className="ml-2 text-gray-600">{cert.certificate_number}</span>
                      </div>
                      {cert.issuing_organization && (
                        <div>
                          <span className="font-medium text-gray-700">Organization:</span>
                          <span className="ml-2 text-gray-600">{cert.issuing_organization}</span>
                        </div>
                      )}
                      {cert.issuing_state_id && (
                        <div>
                          <span className="font-medium text-gray-700">State:</span>
                          <span className="ml-2 text-gray-600">{getStateName(cert.issuing_state_id)}</span>
                        </div>
                      )}
                      {cert.issue_date && (
                        <div>
                          <span className="font-medium text-gray-700">Issued:</span>
                          <span className="ml-2 text-gray-600">{new Date(cert.issue_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {cert.expiry_date && (
                        <div>
                          <span className="font-medium text-gray-700">Expires:</span>
                          <span className="ml-2 text-gray-600">{new Date(cert.expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {data.is_certified === false && (
              <p className="text-sm text-gray-600">
                No certifications required. You may still be considered for opportunities based on your experience and language skills.
              </p>
            )}
          </div>
        </div>

        {/* W-9 Form */}
        {(data.w9_entry_method || data.w9_file || data.w9_data) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">W-9 Tax Form</h3>
              <button 
                onClick={() => onEdit && onEdit(6)}
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">
                  {data.w9_entry_method === 'upload' ? 'W-9 form uploaded' : 'W-9 details entered manually'}
                </span>
              </div>
              
              {data.w9_entry_method === 'manual' && data.w9_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-md">
                  <div>
                    <span className="font-medium text-gray-700">Business Name:</span>
                    <span className="ml-2 text-gray-600">{data.w9_data.business_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tax Classification:</span>
                    <span className="ml-2 text-gray-600">{data.w9_data.tax_classification}</span>
                  </div>
                  {data.w9_data.tax_classification === 'individual' ? (
                    <div>
                      <span className="font-medium text-gray-700">SSN:</span>
                      <span className="ml-2 text-gray-600">***-**-{data.w9_data.ssn?.slice(-4)}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium text-gray-700">EIN:</span>
                      <span className="ml-2 text-gray-600">{data.w9_data.ein}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="ml-2 text-gray-600">{data.w9_data.address}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">City:</span>
                    <span className="ml-2 text-gray-600">{data.w9_data.city}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">State:</span>
                    <span className="ml-2 text-gray-600">{getStateName(data.w9_data.state)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">ZIP Code:</span>
                    <span className="ml-2 text-gray-600">{data.w9_data.zip_code}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emergency Contact */}
        {(data.emergency_contact_name || data.emergency_contact_phone || data.emergency_contact_relationship) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
              <button 
                onClick={() => onEdit && onEdit(1)}
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {data.emergency_contact_name && (
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2">{data.emergency_contact_name}</span>
                </div>
              )}
              {data.emergency_contact_phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2">{data.emergency_contact_phone}</span>
                </div>
              )}
              {data.emergency_contact_relationship && (
                <div>
                  <span className="font-medium text-gray-700">Relationship:</span>
                  <span className="ml-2">{data.emergency_contact_relationship}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terms and Agreements */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Terms and Agreements</h3>
        
        <div className="space-y-4">
          <Checkbox
            label="I accept the Terms and Conditions"
            description={
              <span>
                I have read and agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
                  Terms and Conditions
                </a>
              </span>
            }
            checked={agreements.terms_accepted}
            onChange={(e) => setAgreements(prev => ({ ...prev, terms_accepted: e.target.checked }))}
            error={errors.terms_accepted}
            required
          />
          
          <Checkbox
            label="I accept the Privacy Policy"
            description={
              <span>
                I have read and agree to the{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-800 underline">
                  Privacy Policy
                </a>
              </span>
            }
            checked={agreements.privacy_policy_accepted}
            onChange={(e) => setAgreements(prev => ({ ...prev, privacy_policy_accepted: e.target.checked }))}
            error={errors.privacy_policy_accepted}
            required
          />
          

        </div>
      </div>

      {/* Submission Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your application will be reviewed within 2-3 business days</li>
          <li>• We may contact you if additional information is needed</li>
          <li>• Background verification will be conducted</li>
          <li>• You'll receive an email notification once approved</li>
        </ul>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isSubmitting}
        >
          Previous
        </Button>
        
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !agreements.terms_accepted || !agreements.privacy_policy_accepted}
          loading={isSubmitting}
          className="min-w-[140px]"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </div>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default ReviewStep;