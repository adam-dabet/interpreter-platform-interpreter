import React, { useState, useRef, useEffect } from 'react';
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
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsScrollRef = useRef(null);

  // Handle scroll detection for interpreter agreement
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = termsScrollRef.current;
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Check if user has scrolled to the bottom (with 10px threshold)
      if (scrollHeight - scrollTop - clientHeight < 10) {
        setHasScrolledToBottom(true);
      }
    };

    const scrollContainer = termsScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Also check on initial load if content is already visible
      handleScroll();
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Debug logging
  console.log('ReviewStep - parametricData:', parametricData);
  console.log('ReviewStep - data:', data);
  console.log('ReviewStep - languages:', parametricData?.languages);
  console.log('ReviewStep - usStates:', parametricData?.usStates);
  console.log('ReviewStep - serviceTypes:', parametricData?.serviceTypes);

  const validateAgreements = () => {
    const newErrors = {};
    
    if (!agreements.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the interpreter agreement';
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
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Platform Rate: ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : rate.rate_unit === '3hours' ? '3hr' : rate.rate_unit === '6hours' ? '6hr' : 'hr'}</span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Custom Rate: ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : rate.rate_unit === '3hours' ? '3hr' : rate.rate_unit === '6hours' ? '6hr' : 'hr'}</span>
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

      {/* Interpreter Agreement */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Interpreter Agreement</h3>
        
        {/* Scrollable Interpreter Agreement */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-800 mb-2">Interpreter Agreement</h4>
          <p className="text-sm text-gray-600 mb-3">
            Please read the following interpreter agreement carefully. You must scroll to the bottom before you can accept.
          </p>
          
          <div 
            ref={termsScrollRef}
            className="bg-white border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto text-sm text-gray-700"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Independent Contractor Interpreter Agreement
              </h1>
              
              <div className="text-sm text-gray-600 mb-4">
                <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
              </div>

              <div className="space-y-4">
                <p>
                  This Independent Contractor Interpreter Agreement ("Agreement") is entered into by and between:
                </p>

                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-semibold mb-2">
                    The Integrity Company Ancillary Care Solutions Inc. ("Company")
                  </p>
                  <p>
                    with its principal place of business at 2424 Vista Way, Suite 125, Oceanside, CA 92054 
                    (or such other address as Company may later designate without affecting the validity of this Agreement),
                  </p>
                  <p className="mt-2 font-semibold">and</p>
                  <p className="mt-2">
                    Interpreter ("Contractor"), an independent contractor
                  </p>
                </div>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">1. Independent Contractor Relationship</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Contractor is engaged as an independent contractor and not as an employee, agent, partner, 
                      or joint venturer of Company.
                    </li>
                    <li>
                      Contractor shall have no authority to bind Company or represent itself as an employee of Company.
                    </li>
                    <li>
                      Contractor acknowledges that California Labor Code § 2750.3 ("AB 5") requires independent 
                      contractors to meet certain conditions. Contractor agrees this engagement falls under the 
                      professional services exemption and Contractor shall exercise discretion and independent 
                      judgment in performing interpreting services.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">2. Services</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Contractor agrees to provide interpretation and related language services on an as-needed 
                      basis as scheduled by Company.
                    </li>
                    <li>
                      Contractor shall determine the method, manner, and means of performing services, subject 
                      only to the requirements of the assignment.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">3. Contractor Responsibilities</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Maintain all licenses, certifications, and permits required by law.</li>
                    <li>
                      Maintain active Errors & Omissions (E&O) insurance and provide proof of coverage to Company 
                      upon request.
                    </li>
                    <li>
                      Provide any other documentation required by law or Company (e.g., W-9, business license, 
                      professional certifications).
                    </li>
                    <li>
                      Be responsible for all federal, state, and local taxes arising from compensation received 
                      under this Agreement.
                    </li>
                    <li>
                      Supply and maintain all tools, equipment, and resources necessary to perform interpreting services.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    4. Compensation, Invoicing, Cancellations & No-Shows
                  </h2>
                  <div className="space-y-2">
                    <p>
                      Contractor shall be compensated according to agreed assignment rates as set forth in writing 
                      at the time of scheduling.
                    </p>
                    <p>No minimum amount of work is guaranteed.</p>
                    <p>
                      Contractor is not eligible for employee benefits (including but not limited to health insurance, 
                      retirement benefits, vacation, or sick leave).
                    </p>
                    
                    <div className="mt-2">
                      <p className="font-semibold mb-1">Invoices:</p>
                      <p>
                        Contractor must submit an invoice for every job performed. Each invoice shall include: 
                        (a) The Integrity Company job number; (b) Date of service; (c) Start and end time of service; 
                        and (d) Total hours billed.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">Payment Terms:</p>
                      <p>
                        Payment will be issued within forty-five (45) days from the date Company receives a proper 
                        invoice. While Company's current practice is to process payments within thirty (30) days, 
                        the maximum allowable payment period shall be forty-five (45) days.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">Mileage Policy:</p>
                      <p>
                        Mileage reimbursement is not authorized for assignments located within a twenty-five (25) 
                        mile radius of the assignment location. For assignments beyond that radius, mileage must be 
                        requested in advance and approved in writing by Company.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">Interpreter Cancellations:</p>
                      <p>
                        Should Contractor be unable to attend an assignment, Contractor must notify Company immediately. 
                        Failure to provide advance notice will result in a last-minute cancellation fee for the missed 
                        appointment, equal to the minimum reserved hours for that assignment.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">24-Hour Cancellation Rule:</p>
                      <p>
                        If an assignment is canceled by the Company or client with less than twenty-four (24) hours' 
                        notice, Contractor shall be compensated for the minimum reserved hours or agreed flat rate 
                        for that assignment.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">Interpreter No-Show:</p>
                      <p>
                        If Contractor confirms an assignment but fails to appear without at least twenty-four (24) 
                        hours' prior notice to Company, Contractor shall be responsible for reimbursing Company the 
                        minimum rate that Contractor would have charged Company for that assignment.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="font-semibold mb-1">Repeated No-Shows:</p>
                      <p>
                        Two (2) or more unexcused no-shows within any twelve (12) month period shall constitute 
                        grounds for immediate termination of this Agreement by Company.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">5. Confidentiality & HIPAA Compliance</h2>
                  <div className="space-y-2">
                    <p>
                      Contractor acknowledges that services may involve confidential or protected health information (PHI).
                    </p>
                    <p>
                      Contractor agrees to comply fully with the Health Insurance Portability and Accountability Act 
                      of 1996 (HIPAA) and all related regulations, including safeguarding PHI, limiting access only 
                      to authorized individuals, and reporting any suspected or actual breaches immediately to Company.
                    </p>
                    <p>
                      <span className="font-semibold">Definition of Confidential Information:</span> Information is 
                      deemed Confidential Information if, given the nature of Company's business, a reasonable person 
                      would consider such information confidential.
                    </p>
                    <p>
                      Contractor agrees: (a) to exercise the same degree of care as he/she accords to his/her own 
                      confidential information, but in no case less than reasonable care; and (b) to use Confidential 
                      Information which Company provides to Contractor only for the performance of Services for Company 
                      and not for Contractor's own benefit.
                    </p>
                    <p className="font-semibold text-red-600">
                      Notwithstanding any other provision in this Agreement, Company has the right to immediately 
                      terminate this Agreement in the event of any breach of this provision.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">6. Code of Ethics for Interpreters</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <span className="font-semibold">Accuracy and Completeness:</span> Render all messages faithfully 
                      and accurately without omission, addition, or distortion.
                    </li>
                    <li>
                      <span className="font-semibold">Confidentiality:</span> Protect the privacy of all parties and 
                      maintain strict confidentiality regarding all information learned during assignments.
                    </li>
                    <li>
                      <span className="font-semibold">Impartiality:</span> Remain neutral and avoid conflicts of 
                      interest. Disclose any real or potential conflicts to Company immediately.
                    </li>
                    <li>
                      <span className="font-semibold">Professional Conduct:</span> Conduct oneself with professionalism, 
                      respect, and courtesy at all times.
                    </li>
                    <li>
                      <span className="font-semibold">Competence:</span> Accept only assignments within one's 
                      qualifications, skills, and certifications.
                    </li>
                    <li>
                      <span className="font-semibold">Continuous Improvement:</span> Maintain and improve language 
                      proficiency, cultural competence, and interpreting skills through ongoing professional development.
                    </li>
                    <li>
                      <span className="font-semibold">Compliance with Law:</span> Adhere to all applicable federal, 
                      state, and local laws, including HIPAA and patient rights laws.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">7. Non-Solicitation & Non-Circumvention</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Contractor agrees not to solicit, contract with, or accept work directly from any Company client, 
                      customer, or referral source introduced through the Company during the term of this Agreement 
                      and for a period of twelve (12) months following termination.
                    </li>
                    <li>
                      Contractor acknowledges that all clients and referral sources are the exclusive property of 
                      the Company.
                    </li>
                    <li>
                      Any violation of this provision shall entitle Company to seek injunctive relief, damages, and 
                      recovery of all lost profits resulting from the breach.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">8. Indemnification</h2>
                  <div className="space-y-2">
                    <p>
                      Contractor shall indemnify, defend, and hold harmless Company, its officers, employees, and 
                      clients from and against any claims, damages, liabilities, costs, and expenses arising from 
                      Contractor's negligence, misconduct, or failure to comply with this Agreement.
                    </p>
                    <p>
                      Each Party hereby agrees to indemnify and hold harmless the other and such indemnified Party's 
                      subsidiaries, directors, officers, agents, and employees from and against all claims, liabilities, 
                      and expenses, including reasonable attorneys' fees, which may result from acts, omissions, or 
                      breach of this Agreement by the indemnifying Party, its subcontractors, employees, or agents. 
                      This provision shall survive the termination of this Agreement.
                    </p>
                    <p>
                      <span className="font-semibold">Limitation of Liability:</span> Notwithstanding anything to the 
                      contrary, except in cases of willful misconduct or gross negligence, Contractor's entire liability 
                      to Company for damages or other amounts arising out of or in connection with the services provided 
                      under this Agreement shall not exceed the total amount of payments made by Company to Contractor 
                      under this Agreement.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">9. Term & Termination</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      This Agreement shall commence on the date of acceptance and remain in effect until terminated 
                      by either party upon written notice.
                    </li>
                    <li>
                      Either party may terminate this Agreement at any time, with or without cause, upon written notice.
                    </li>
                    <li>
                      Company may terminate this Agreement immediately in the event of repeated no-shows, ethical 
                      violations, or breach of confidentiality.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">10. Governing Law</h2>
                  <p>
                    This Agreement shall be governed by and construed in accordance with the laws of the State of California.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">11. Notices and Address Changes</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      All notices shall be sent to the addresses provided, unless either party provides written 
                      notice of a change of address.
                    </li>
                    <li>
                      A change in address by either party shall not void or otherwise affect the enforceability 
                      of this Agreement.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">12. Entire Agreement</h2>
                  <p>
                    This Agreement constitutes the entire understanding between the parties and supersedes all prior 
                    agreements or understandings, whether oral or written.
                  </p>
                </section>

                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold text-gray-900 mb-2">Company Contact Information</h3>
                    <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
                    <p>2424 Vista Way, Suite 125</p>
                    <p>Oceanside, CA 92054</p>
                    <p className="mt-1">Phone: 888-418-2565</p>
                    <p>Email: support@theintegritycompanyinc.com</p>
                  </div>
                </div>

                {!hasScrolledToBottom && (
                  <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm text-gray-700 font-medium">
                      Please scroll to the bottom to continue.
                    </p>
                  </div>
                )}

                {hasScrolledToBottom && (
                  <div className="mt-4 p-3 bg-green-100 border-l-4 border-green-400 rounded">
                    <p className="text-sm text-gray-700 font-medium">
                      ✓ You have reached the end of the Interpreter Agreement. You may now accept the agreement below.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Checkbox
            label="I accept the Interpreter Agreement"
            description={
              <span>
                I have read and agree to the Interpreter Agreement above.
              </span>
            }
            checked={agreements.terms_accepted}
            onChange={(e) => setAgreements(prev => ({ ...prev, terms_accepted: e.target.checked }))}
            error={errors.terms_accepted}
            required
            disabled={!hasScrolledToBottom}
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