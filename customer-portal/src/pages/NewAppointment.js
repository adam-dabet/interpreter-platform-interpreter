import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  PlusIcon, 
  CalendarIcon, 
  MapPinIcon,
  UserIcon,
  LanguageIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import InterpreterSearchAnimation from '../components/InterpreterSearchAnimation';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Appointment type options (matching admin portal)
const appointmentTypeOptions = [
  { value: 'acupuncture', label: 'Acupuncture' },
  { value: 'ame', label: 'AME' },
  { value: 'aoe_coe', label: 'AOE/COE' },
  { value: 'benefit_meeting', label: 'Benefit Meeting' },
  { value: 'cardiac_evaluation', label: 'Cardiac Evaluation' },
  { value: 'chiropractor', label: 'Chiropractor' },
  { value: 'consult_telehealth', label: 'Consult (Telehealth)' },
  { value: 'consult_treat', label: 'Consult & Treat' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'ct_scan', label: 'Ct Scan' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'deposition', label: 'Deposition' },
  { value: 'deposition_zoom', label: 'Deposition (Via Zoom)' },
  { value: 'diagnostic_testing', label: 'Diagnostic Testing' },
  { value: 'ekg', label: 'EKG' },
  { value: 'emg', label: 'EMG' },
  { value: 'employee_meeting', label: 'Employee Meeting' },
  { value: 'epidural_injection', label: 'Epidural Injection' },
  { value: 'equipment_explination', label: 'Equipment Explination' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'follow_up_telehealth', label: 'Follow up (Telehealth)' },
  { value: 'follow_up_lab_work', label: 'Follow Up & Lab Work' },
  { value: 'follow_up_pt', label: 'Follow Up & PT' },
  { value: 'functional_capacity', label: 'Functional Capacity' },
  { value: 'hearing_loss', label: 'Hearing Loss' },
  { value: 'hernia_consult', label: 'Hernia Consult' },
  { value: 'ime', label: 'IME' },
  { value: 'initial_appointment', label: 'Initial Appointment' },
  { value: 'injection', label: 'Injection' },
  { value: 'injection_steroid', label: 'Injection Steroid' },
  { value: 'internal_medicine', label: 'Internal Medicine' },
  { value: 'interview', label: 'Interview' },
  { value: 'interview_witness', label: 'Interview Witness' },
  { value: 'laser_procedure', label: 'Laser Procedure' },
  { value: 'legal', label: 'Legal' },
  { value: 'medical', label: 'Medical' },
  { value: 'medical_telehealth', label: 'Medical (Telehealth)' },
  { value: 'medical_clerance', label: 'Medical Clerance' },
  { value: 'medical_procedure', label: 'Medical Procedure' },
  { value: 'mri', label: 'MRI' },
  { value: 'ncm_meeting', label: 'NCM Meeting' },
  { value: 'occupational', label: 'Occupational' },
  { value: 'one_time_appointment', label: 'One-Time Appointment' },
  { value: 'orthopaedic', label: 'Orthopaedic' },
  { value: 'pain_management', label: 'Pain Management' },
  { value: 'physical_therapy', label: 'Physical Therapy' },
  { value: 'physical_therapy_initial', label: 'Physical Therapy Initial' },
  { value: 'psychological', label: 'Psychological' },
  { value: 'qme', label: 'QME' },
  { value: 'recorded_statement', label: 'Recorded Statement' },
  { value: 'second_opinion', label: 'Second Opinion' },
  { value: 'settlement_documents', label: 'Settlement Documents' },
  { value: 'status_conference', label: 'Status Conference' },
  { value: 'status_conference_remote', label: 'Status Conference (Remote)' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'surgery_check_in', label: 'Surgery Check In' },
  { value: 'surgery_discharge', label: 'Surgery Discharge' },
  { value: 'surgery_post_op', label: 'Surgery Post-Op' },
  { value: 'surgery_pre_op', label: 'Surgery Pre-Op' },
  { value: 'surgical_consult', label: 'Surgical Consult' },
  { value: 'trial', label: 'Trial' },
  { value: 'vocational_evaluation', label: 'Vocational Evaluation' },
  { value: 'x_ray', label: 'X-Ray' },
  { value: 'mandatory_settlement_agreement', label: 'Mandatory Settlement Agreement' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'mandatory_settlement_conference', label: 'Mandatory Settlement Conference' },
  { value: 'permanent_stationary', label: 'Permanent & Stationary' },
  { value: 'cognitive_behavioral_therapy', label: 'Cognitive behavioral therapy' }
];

// UI Components
const Input = ({ value, onChange, placeholder, type = 'text', className = '', label, required = false, disabled = false, readOnly = false }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled || readOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
    />
  </div>
);

const SearchableSelect = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Search...", 
  className = '', 
  required = false, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Set search term when value changes (for external updates)
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearchTerm(selectedOption.label);
      }
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    if (option && option.value !== undefined) {
      onChange({ target: { value: option.value } });
      setSearchTerm(option.label || '');
      setIsOpen(false);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className={`relative searchable-select ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelect(option)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Step Components
const StepIndicator = ({ currentStep, totalSteps, completedSteps, onStepClick }) => {
  const steps = [
    { number: 1, title: 'Claim Info', icon: UserIcon },
    { number: 2, title: 'Appointment Details', icon: CalendarIcon },
    { number: 3, title: 'Interpreter Requirements', icon: LanguageIcon },
    { number: 4, title: 'Location', icon: MapPinIcon }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.number);
          const isCurrent = currentStep === step.number;
          const isClickable = step.number <= currentStep || completedSteps.has(step.number - 1);
          
          return (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }
                    ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </button>
                <span className={`mt-2 text-xs font-medium ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  completedSteps.has(step.number) ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Step1ClaimInfo = ({ formData, formOptions, handleInputChange, handleClaimantChange, handleClaimChange, clearClaimantSelection }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Claimant & Claim</h2>
      <p className="text-gray-600">Choose the claimant and specific claim for this appointment</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SearchableSelect
          label="Select Claimant"
          value={formData.claimantId}
          onChange={(e) => handleClaimantChange(e.target.value)}
          options={(formOptions.claimants || []).map(claimant => ({
            value: claimant.id.toString(),
            label: claimant.first_name && claimant.last_name 
              ? `${claimant.first_name} ${claimant.last_name}`
              : claimant.name || `Claimant ${claimant.id}`
          }))}
          placeholder="Search for a claimant..."
          required
        />
        {formData.claimantId && (
          <button
            type="button"
            onClick={clearClaimantSelection}
            className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear selection
          </button>
        )}
      </div>
      
      <div>
        <SearchableSelect
          label="Select Claim"
          value={formData.claimId}
          onChange={(e) => handleClaimChange(e.target.value)}
          options={(formOptions.claims || []).map(claim => ({
            value: claim.id.toString(),
            label: `${claim.claim_number} - ${claim.case_type}`
          }))}
          placeholder={formData.claimantId ? "Select claim" : "Select claimant first"}
          required
          disabled={!formData.claimantId}
        />
      </div>
    </div>
    
    {formData.claimantId && (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center mb-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-800">
            Claimant Information Auto-filled
          </span>
        </div>
        <p className="text-xs text-blue-600">
          The claimant's information has been automatically populated and will be used for the appointment.
        </p>
      </div>
    )}
  </div>
);

const Step2AppointmentDetails = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Details</h2>
      <p className="text-gray-600">Set the date, time, and type of appointment</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        label="Date"
        type="date"
        value={formData.appointmentDate}
        onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
        required
      />
      
      <Input
        label="Start Time"
        type="time"
        value={formData.startTime}
        onChange={(e) => handleInputChange('startTime', e.target.value)}
        required
      />
      
      <Input
        label="End Time"
        type="time"
        value={formData.endTime}
        onChange={(e) => handleInputChange('endTime', e.target.value)}
        required
      />
      
      <Input
        label="Arrival Time"
        type="time"
        value={formData.arrivalTime}
        onChange={(e) => handleInputChange('arrivalTime', e.target.value)}
        placeholder="When should interpreter arrive?"
      />
      
      <SearchableSelect
        label="Appointment Type"
        value={formData.appointmentType}
        onChange={(e) => handleInputChange('appointmentType', e.target.value)}
        options={appointmentTypeOptions}
        placeholder="Select appointment type"
        required
      />
      
      <Input
        label="Doctor Name"
        value={formData.doctorName}
        onChange={(e) => handleInputChange('doctorName', e.target.value)}
        placeholder="e.g., Dr. La Pilusa"
      />
    </div>

    <div>
      <Input
        label="Appointment Notes"
        value={formData.appointmentNotes || ''}
        onChange={(e) => handleInputChange('appointmentNotes', e.target.value)}
        placeholder="Additional details about the appointment..."
      />
    </div>
  </div>
);

const Step3InterpreterRequirements = ({ formData, formOptions, handleInputChange }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Interpreter Requirements</h2>
      <p className="text-gray-600">Specify the language and interpreter type needed</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SearchableSelect
        label="Language"
        value={formData.language}
        onChange={(e) => handleInputChange('language', e.target.value)}
        options={(formOptions.languages || []).map(lang => ({ value: lang.id, label: lang.name }))}
        placeholder="Select language"
        required
      />
      
      <SearchableSelect
        label="Service Type"
        value={formData.serviceType}
        onChange={(e) => handleInputChange('serviceType', e.target.value)}
        options={(formOptions.serviceTypes || []).map(type => ({
          value: type.id.toString(),
          label: type.name
        }))}
        placeholder="Select service type"
        required
      />
      
      <SearchableSelect
        label="Interpreter Type"
        value={formData.interpreterType}
        onChange={(e) => handleInputChange('interpreterType', e.target.value)}
        options={(formOptions.interpreterTypes || []).map(type => ({
          value: type.id.toString(),
          label: type.name
        }))}
        placeholder="Select interpreter type"
        required
      />
    </div>

    <div>
      <Input
        label="Special Requirements"
        value={formData.specialRequirements}
        onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
        placeholder="Any special requirements or notes"
      />
    </div>
  </div>
);

const Step4Location = ({ formData, formOptions, handleInputChange, locationAutocompleteRef, mapsInitialized }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Details</h2>
      <p className="text-gray-600">Specify whether this is a remote or in-person appointment</p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center p-4 border border-gray-200 rounded-lg">
        <input
          type="checkbox"
          id="isRemote"
          checked={formData.isRemote}
          onChange={(e) => handleInputChange('isRemote', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isRemote" className="ml-3 block text-sm text-gray-900">
          This is a remote appointment (video/phone)
        </label>
      </div>
      
      {!formData.isRemote && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                ref={locationAutocompleteRef}
                type="text"
                value={formData.locationAddress}
                onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                placeholder={mapsInitialized ? "Start typing a business address..." : "Enter business address"}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {mapsInitialized && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 Start typing to see business address suggestions
                </p>
              )}
            </div>
          </div>
          
          <Input
            label="City"
            value={formData.locationCity}
            onChange={(e) => handleInputChange('locationCity', e.target.value)}
            placeholder="City"
            required
          />
          
          <Input
            label="State"
            value={formData.locationState}
            onChange={(e) => handleInputChange('locationState', e.target.value)}
            placeholder="State"
            required
          />
          
          <Input
            label="ZIP Code"
            value={formData.locationZipCode}
            onChange={(e) => handleInputChange('locationZipCode', e.target.value)}
            placeholder="ZIP Code"
            required
          />
          
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="e.g., 619.281.6414"
            required
          />
        </div>
      )}
    </div>
  </div>
);

const NewAppointment = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isReRequest, setIsReRequest] = useState(false);
  const [originalAppointment, setOriginalAppointment] = useState(null);
  const [showSearchAnimation, setShowSearchAnimation] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [searchInterval, setSearchInterval] = useState(null);
  const [searchStartTime, setSearchStartTime] = useState(null);
  const [mapsInitialized, setMapsInitialized] = useState(false);
  const locationAutocompleteRef = useRef(null);
  const [formOptions, setFormOptions] = useState({
    claimants: [],
    claims: [],
    interpreterTypes: [],
    serviceTypes: [],
    languages: []
  });
  const [formData, setFormData] = useState({
    // Appointment Details
    appointmentDate: '',
    startTime: '',
    endTime: '',
    arrivalTime: '',
    appointmentType: '',
    appointmentNotes: '',
    doctorName: '',
    isRemote: false,
    locationAddress: '',
    locationCity: '',
    locationState: '',
    locationZipCode: '',
    phone: '',
    
    // Claimant & Claim Selection
    claimantId: '',
    claimId: '',
    
    // Auto-populated Claimant Information (read-only)
    claimantFirstName: '',
    claimantLastName: '',
    claimantGender: '',
    claimantDateOfBirth: '',
    claimantPhone: '',
    claimantLanguage: '',
    claimantAddress: '',
    claimantAddressLatitude: '',
    claimantAddressLongitude: '',
    claimantEmployerInsured: '',
    
    // Interpreter Requirements
    language: '',
    interpreterType: '',
    serviceType: '',
    specialRequirements: ''
  });

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const totalSteps = 4;

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (searchInterval) {
        clearInterval(searchInterval);
      }
    };
  }, [searchInterval]);

  // Update search duration for animation
  useEffect(() => {
    let durationInterval;
    if (showSearchAnimation && searchStartTime) {
      durationInterval = setInterval(() => {
        // Force re-render to update search duration
        setSearchStartTime(prev => prev);
      }, 1000);
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [showSearchAnimation, searchStartTime]);

  const loadOriginalAppointment = useCallback(async (appointmentId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments/${appointmentId}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalAppointment(data.data);
        return data.data;
      } else {
        toast.error(data.message || 'Failed to load original appointment');
        return null;
      }
    } catch (error) {
      console.error('Error loading original appointment:', error);
      toast.error('Failed to load original appointment');
      return null;
    }
  }, [makeAuthenticatedRequest]);

  const loadFormOptions = useCallback(async () => {
    try {
      const [claimantsResponse, interpreterTypesResponse, serviceTypesResponse, languagesResponse] = await Promise.all([
        makeAuthenticatedRequest(`${API_BASE}/customer/claimants`),
        makeAuthenticatedRequest(`${API_BASE}/customer/interpreter-types`),
        makeAuthenticatedRequest(`${API_BASE}/parametric/service-types`),
        makeAuthenticatedRequest(`${API_BASE}/customer/languages`)
      ]);
      
      const claimantsData = await claimantsResponse.json();
      const interpreterTypesData = await interpreterTypesResponse.json();
      const serviceTypesData = await serviceTypesResponse.json();
      const languagesData = await languagesResponse.json();
      
      setFormOptions({
        claimants: claimantsData.success ? claimantsData.data : [],
        interpreterTypes: interpreterTypesData.success ? interpreterTypesData.data : [],
        serviceTypes: serviceTypesData.success ? serviceTypesData.data : [],
        languages: languagesData.success ? languagesData.data : []
      });
    } catch (error) {
      console.error('Error loading form options:', error);
      toast.error('Failed to load form options');
    }
  }, [makeAuthenticatedRequest]);

  const loadClaimsForClaimant = useCallback(async (claimantId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/claimants/${claimantId}/claims`);
      const data = await response.json();
      
      if (data.success) {
        setFormOptions(prev => ({
          ...prev,
          claims: data.data
        }));
        return data.data;
      } else {
        console.error('Failed to load claims:', data.message);
        setFormOptions(prev => ({ ...prev, claims: [] }));
        return [];
      }
    } catch (error) {
      console.error('Error loading claims:', error);
      setFormOptions(prev => ({ ...prev, claims: [] }));
      return [];
    }
  }, [makeAuthenticatedRequest]);

  const populateFormFromOriginalAppointment = useCallback((originalAppointment) => {
    setFormData(prev => ({
      ...prev,
      // Don't copy date/time fields for re-request
      appointmentType: originalAppointment.appointment_type || '',
      appointmentNotes: originalAppointment.appointment_notes || '',
      doctorName: originalAppointment.doctor_name || '',
      isRemote: originalAppointment.is_remote || false,
      locationAddress: originalAppointment.location_address || '',
      locationCity: originalAppointment.location_city || '',
      locationState: originalAppointment.location_state || '',
      locationZipCode: originalAppointment.location_zip_code || '',
      phone: originalAppointment.phone || '',
      claimantId: originalAppointment.claimant_id ? originalAppointment.claimant_id.toString() : '',
      claimId: originalAppointment.claim_id ? originalAppointment.claim_id.toString() : '',
      language: originalAppointment.source_language_id ? originalAppointment.source_language_id.toString() : '',
      interpreterType: originalAppointment.interpreter_type_id ? originalAppointment.interpreter_type_id.toString() : '',
      serviceType: originalAppointment.service_type_id ? originalAppointment.service_type_id.toString() : '',
      specialRequirements: originalAppointment.special_requirements || ''
    }));
  }, []);

  // Load form options on component mount
  useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

  // Handle re-request functionality
  useEffect(() => {
    const reRequestId = searchParams.get('reRequest');
    const claimantId = searchParams.get('claimantId');
    const claimId = searchParams.get('claimId');
    
    if (reRequestId) {
      setIsReRequest(true);
      loadOriginalAppointment(reRequestId).then((appointment) => {
        if (appointment) {
          populateFormFromOriginalAppointment(appointment);
        }
      });
    }
  }, [searchParams, loadOriginalAppointment, populateFormFromOriginalAppointment]);

  // Handle claimant and claim selection from URL parameters
  useEffect(() => {
    const claimantId = searchParams.get('claimantId');
    const claimId = searchParams.get('claimId');
    
    if ((formOptions.claimants || []).length > 0 && claimantId && !isReRequest) {
      handleClaimantChange(claimantId).then(() => {
        if (claimId) {
          setFormData(prev => ({ ...prev, claimId: claimId }));
        }
      });
    }
  }, [formOptions.claimants, searchParams, isReRequest]);

  // Load claims when claimant is selected
  useEffect(() => {
    if (formData.claimantId) {
      loadClaimsForClaimant(formData.claimantId);
    } else {
      setFormOptions(prev => ({ ...prev, claims: [] }));
      setFormData(prev => ({ ...prev, claimId: '' }));
    }
  }, [formData.claimantId, loadClaimsForClaimant]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClaimantChange = useCallback((claimantId) => {
    return new Promise((resolve) => {
      if (!claimantId) {
        setFormData(prev => ({
          ...prev,
          claimantId: '',
          claimId: '',
          claimantFirstName: '',
          claimantLastName: '',
          claimantGender: '',
          claimantDateOfBirth: '',
          claimantPhone: '',
          claimantLanguage: '',
          claimantAddress: '',
          claimantAddressLatitude: '',
          claimantAddressLongitude: '',
          claimantEmployerInsured: ''
        }));
        resolve();
        return;
      }

      const selectedClaimant = (formOptions.claimants || []).find(c => c.id === parseInt(claimantId));
      if (selectedClaimant) {
        setFormData(prev => ({
          ...prev,
          claimantId: claimantId,
          claimId: '',
          claimantFirstName: selectedClaimant.first_name || '',
          claimantLastName: selectedClaimant.last_name || '',
          claimantGender: selectedClaimant.gender || '',
          claimantDateOfBirth: selectedClaimant.date_of_birth || '',
          claimantPhone: selectedClaimant.phone || '',
          claimantLanguage: selectedClaimant.language || '',
          claimantAddress: selectedClaimant.address || '',
          claimantAddressLatitude: selectedClaimant.address_latitude || '',
          claimantAddressLongitude: selectedClaimant.address_longitude || '',
          claimantEmployerInsured: selectedClaimant.employer_insured || ''
        }));
        
        loadClaimsForClaimant(claimantId).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }, [formOptions.claimants, loadClaimsForClaimant]);

  const handleClaimChange = (claimId) => {
    if (!claimId) {
      setFormData(prev => ({
        ...prev,
        claimId: ''
      }));
      return;
    }

    // Find the selected claim
    const selectedClaim = (formOptions.claims || []).find(c => c.id === parseInt(claimId));
    
    if (selectedClaim) {
      // Helper function to format dates for HTML date inputs
      const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        // If it's already a string in YYYY-MM-DD format, return as is
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        // If it's a Date object or other format, convert to YYYY-MM-DD
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      setFormData(prev => ({
        ...prev,
        claimId: claimId,
        // Update any claim-specific fields if needed
        dateOfInjury: formatDateForInput(selectedClaim.date_of_injury) || formData.dateOfInjury,
        employer: selectedClaim.employer || formData.employer
      }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearClaimantSelection = () => {
    setFormData(prev => ({
      ...prev,
      claimantId: '',
      claimId: '',
      claimantName: '',
      claimantAddress: '',
      claimantCity: '',
      claimantState: '',
      claimantZipCode: '',
      dateOfBirth: '',
      dateOfInjury: '',
      claimantPhone: '',
      employer: '',
      examiner: '',
      appointmentType: '',
      appointmentNotes: ''
    }));
    setFormOptions(prev => ({ ...prev, claims: [] }));
  };

  // Step validation functions
  const validateStep = (step) => {
    switch (step) {
      case 1: // Claim Info
        return formData.claimantId && formData.claimId;
      case 2: // Appointment Details
        return formData.appointmentDate && formData.startTime && formData.endTime && formData.appointmentType;
      case 3: // Interpreter Requirements
        return formData.language && formData.interpreterType && formData.serviceType;
      case 4: // Location
        if (formData.isRemote) {
          return true; // Remote appointments don't need location details
        }
        return formData.locationAddress && formData.locationCity && formData.locationState && formData.locationZipCode;
      default:
        return false;
    }
  };

  const markStepCompleted = (step) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      markStepCompleted(currentStep);
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Please fill in all required fields before proceeding');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    // Allow going to any completed step or the next step
    if (step <= currentStep || completedSteps.has(step - 1)) {
      setCurrentStep(step);
    }
  };

  const handleCancelSearch = () => {
    // Clear the interval
    if (searchInterval) {
      clearInterval(searchInterval);
      setSearchInterval(null);
    }
    
    // Hide animation and navigate
    setShowSearchAnimation(false);
    toast('Search cancelled. You can check your appointments page for updates.');
    navigate('/appointments');
  };

  const handleCloseSearch = () => {
    // Just hide the animation without navigating away
    setShowSearchAnimation(false);
    toast('Search is continuing in the background. You can check your appointments page for updates.');
  };

  const checkAppointmentStatus = async (appointmentId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/appointments/${appointmentId}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        const appointment = data.data;
        
        // If interpreter is assigned, hide animation and navigate
        if (appointment.status === 'assigned' || appointment.status === 'reminders_sent' || 
            appointment.status === 'in_progress' || appointment.status === 'completed' ||
            appointment.status === 'completion_report' || appointment.status === 'billed' ||
            appointment.status === 'closed' || appointment.status === 'interpreter_paid') {
          
          // Clear the interval
          if (searchInterval) {
            clearInterval(searchInterval);
            setSearchInterval(null);
          }
          
          // Hide animation and navigate
          setShowSearchAnimation(false);
          toast.success('Interpreter found! Your appointment has been assigned.');
          navigate('/appointments');
        }
      }
    } catch (error) {
      console.error('Error checking appointment status:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.appointmentDate || !formData.startTime || !formData.endTime || 
          !formData.appointmentType || !formData.claimantId || 
          !formData.claimId || !formData.interpreterType || !formData.serviceType) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate location fields for non-remote appointments
      if (!formData.isRemote && (!formData.locationAddress || !formData.locationCity || 
          !formData.locationState || !formData.locationZipCode)) {
        toast.error('Please fill in all location fields for in-person appointments');
        return;
      }

      // Validate time range
      if (formData.startTime >= formData.endTime) {
        toast.error('End time must be after start time');
        return;
      }

      const appointmentData = {
        appointmentDate: formData.appointmentDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        arrivalTime: formData.arrivalTime,
        appointmentType: formData.appointmentType,
        doctorName: formData.doctorName,
        isRemote: formData.isRemote,
        locationAddress: formData.locationAddress,
        locationCity: formData.locationCity,
        locationState: formData.locationState,
        locationZipCode: formData.locationZipCode,
        phone: formData.phone,
        claimantId: parseInt(formData.claimantId),
        claimId: formData.claimId ? parseInt(formData.claimId) : null,
        serviceTypeId: formData.serviceType ? parseInt(formData.serviceType) : undefined,
        language: formData.language,
        interpreterType: formData.interpreterType,
        specialRequirements: formData.specialRequirements,
        appointmentNotes: formData.appointmentNotes
      };

      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/appointments/simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment request submitted successfully!');
        setShowSearchAnimation(true);
        setAppointmentId(data.data.id);
        setSearchStartTime(Date.now());
        
        // Start polling for appointment status every 2 seconds
        const interval = setInterval(() => {
          checkAppointmentStatus(data.data.id);
        }, 2000);
        setSearchInterval(interval);
        
        // Set a maximum timeout of 5 minutes to prevent infinite polling
        setTimeout(() => {
          if (searchInterval) {
            clearInterval(searchInterval);
            setSearchInterval(null);
          }
          setShowSearchAnimation(false);
          toast('Search is taking longer than expected. You can check your appointments page for updates.');
          navigate('/appointments');
        }, 300000); // 5 minutes
      } else {
        toast.error(data.message || 'Failed to submit appointment request');
      }
    } catch (error) {
      console.error('Error submitting appointment:', error);
      toast.error('Failed to submit appointment request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center">
            <button
              onClick={() => navigate('/appointments')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <PlusIcon className="h-8 w-8 mr-3 text-blue-600" />
                {isReRequest ? 'Re-request Appointment' : 'Schedule New Appointment'}
              </h1>
              <p className="mt-2 text-gray-600">
                {isReRequest 
                  ? 'Create a new appointment request with the same details as the original appointment'
                  : 'Request an interpreter for a new appointment'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Multi-Step Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow"
        >
          {isReRequest && originalAppointment && (
            <div className="p-6 border-b border-gray-200 bg-green-50">
              <div className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    Re-requesting appointment from {formatDate(originalAppointment.scheduled_date)}
                  </h3>
                  <p className="text-sm text-green-600 mt-1">
                    The form has been pre-filled with the original appointment details. Please update the date and time for the new appointment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step Indicator */}
          <div className="p-6 border-b border-gray-200">
            <StepIndicator 
              currentStep={currentStep}
              totalSteps={totalSteps}
              completedSteps={completedSteps}
              onStepClick={goToStep}
            />
          </div>

          {/* Step Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && (
                <Step1ClaimInfo
                  formData={formData}
                  formOptions={formOptions}
                  handleInputChange={handleInputChange}
                  handleClaimantChange={handleClaimantChange}
                  handleClaimChange={handleClaimChange}
                  clearClaimantSelection={clearClaimantSelection}
                />
              )}
              
              {currentStep === 2 && (
                <Step2AppointmentDetails
                  formData={formData}
                  handleInputChange={handleInputChange}
                />
              )}
              
              {currentStep === 3 && (
                <Step3InterpreterRequirements
                  formData={formData}
                  formOptions={formOptions}
                  handleInputChange={handleInputChange}
                />
              )}
              
              {currentStep === 4 && (
                <Step4Location
                  formData={formData}
                  formOptions={formOptions}
                  handleInputChange={handleInputChange}
                  locationAutocompleteRef={locationAutocompleteRef}
                  mapsInitialized={mapsInitialized}
                />
              )}
            </form>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            
            <div className="flex space-x-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Previous
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      {isReRequest ? 'Re-request Appointment' : 'Submit Request'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Interpreter Search Animation */}
      <InterpreterSearchAnimation 
        isVisible={showSearchAnimation} 
        searchDuration={searchStartTime ? Date.now() - searchStartTime : 0}
        onCancel={handleCancelSearch}
        onClose={handleCloseSearch}
      />
    </div>
  );
};

export default NewAppointment;