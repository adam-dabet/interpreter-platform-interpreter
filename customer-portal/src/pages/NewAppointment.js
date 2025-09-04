import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  CalendarIcon, 
  MapPinIcon,
  UserIcon,
  LanguageIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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
      disabled={disabled}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled || readOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
    />
  </div>
);


const SearchableSelect = ({ value, onChange, options = [], placeholder, className = '', label, required = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options || []);
  const dropdownRef = useRef(null);

  // Initialize searchTerm with the selected option's label
  useEffect(() => {
    if (value && options && Array.isArray(options)) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearchTerm(selectedOption.label || '');
      }
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, options]);

  useEffect(() => {
    if (!options || !Array.isArray(options)) {
      setFilteredOptions([]);
      return;
    }
    
    const filtered = options.filter(option => 
      (option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.value && String(option.value).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  // Handle click outside to close dropdown
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
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(option)}
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

const NewAppointment = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
        claimants: claimantsData.data || [],
        claims: [],
        interpreterTypes: interpreterTypesData.data || [],
        serviceTypes: serviceTypesData.data || [],
        languages: languagesData.data || []
      });
    } catch (error) {
      console.error('Error loading form options:', error);
      toast.error('Failed to load form options');
    }
  }, [makeAuthenticatedRequest]);

  // Setup location autocomplete (must be defined before initializeGoogleMaps)
  const setupLocationAutocomplete = useCallback(() => {
    try {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn('Google Maps Places API not available');
        return;
      }

      if (!locationAutocompleteRef.current) {
        console.warn('Location autocomplete ref not available');
        return;
      }

      const autocomplete = new window.google.maps.places.Autocomplete(
        locationAutocompleteRef.current,
        {
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'us' }
        }
      );

      autocomplete.addListener('place_changed', () => {
        try {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            const addressComponents = place.address_components || [];
            let city = '';
            let state = '';
            let zipCode = '';

            addressComponents.forEach(component => {
              const types = component.types;
              if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (types.includes('postal_code')) {
                zipCode = component.long_name;
              }
            });

            setFormData(prev => ({
              ...prev,
              locationAddress: place.formatted_address || place.name || '',
              locationCity: city,
              locationState: state,
              locationZipCode: zipCode
            }));
          }
        } catch (error) {
          console.error('Error handling place selection:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up location autocomplete:', error);
      setMapsInitialized(false);
    }
  }, []);

  // Google Maps initialization
  const initializeGoogleMaps = useCallback(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setMapsInitialized(true);
      setupLocationAutocomplete();
      return;
    }

    // Check if API key exists
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_actual_api_key_here') {
      console.warn('Google Maps API key not configured. Address autocomplete will be disabled.');
      setMapsInitialized(false);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('Google Maps API loaded successfully');
          setMapsInitialized(true);
          setupLocationAutocomplete();
        } else {
          console.error('Google Maps API loaded but objects not available');
          setMapsInitialized(false);
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        setMapsInitialized(false);
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      setMapsInitialized(false);
    };
    
    document.head.appendChild(script);
  }, [setupLocationAutocomplete]);

  const loadClaimsForClaimant = useCallback(async (claimantId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/claimants/${claimantId}/claims`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setFormOptions(prev => ({ ...prev, claims: data.data }));
      }
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    loadFormOptions();
    
    // Initialize Google Maps with error handling
    try {
      initializeGoogleMaps();
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapsInitialized(false);
    }
  }, [loadFormOptions, initializeGoogleMaps]);

  useEffect(() => {
    // Load claims when claimant is selected
    if (formData.claimantId) {
      loadClaimsForClaimant(formData.claimantId);
    } else {
      setFormOptions(prev => ({ ...prev, claims: [] }));
      setFormData(prev => ({ ...prev, claimId: '' }));
    }
  }, [formData.claimantId, loadClaimsForClaimant]);

  // Setup autocomplete when maps are initialized and ref is available
  useEffect(() => {
    if (mapsInitialized && locationAutocompleteRef.current) {
      setupLocationAutocomplete();
    }
  }, [mapsInitialized, setupLocationAutocomplete]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClaimantChange = (claimantId) => {
    if (!claimantId) {
      // Clear all claimant data if no claimant selected
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
        claimantEmployerInsured: '',
        appointmentType: '',
        appointmentNotes: '' // Clear appointment notes when clearing claimant
      }));
      return;
    }

    // Find the selected claimant
    const selectedClaimant = formOptions.claimants.find(c => c.id === parseInt(claimantId));
    
    if (selectedClaimant) {
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
        claimantId: claimantId,
        claimId: '',
        // Updated claimant fields to match new structure
        claimantFirstName: selectedClaimant.first_name || '',
        claimantLastName: selectedClaimant.last_name || '',
        claimantGender: selectedClaimant.gender || '',
        claimantDateOfBirth: formatDateForInput(selectedClaimant.date_of_birth),
        claimantPhone: selectedClaimant.phone || '',
        claimantLanguage: selectedClaimant.language || '',
        claimantAddress: selectedClaimant.address || '',
        claimantAddressLatitude: selectedClaimant.address_latitude || '',
        claimantAddressLongitude: selectedClaimant.address_longitude || '',
        claimantEmployerInsured: selectedClaimant.employer_insured || '',
        appointmentType: '', // Reset appointment type when a new claimant is selected
        appointmentNotes: '' // Clear appointment notes when a new claimant is selected
      }));

      // Load claims for this claimant
      loadClaimsForClaimant(claimantId);
    }
  };

  const handleClaimChange = (claimId) => {
    if (!claimId) {
      setFormData(prev => ({
        ...prev,
        claimId: ''
      }));
      return;
    }

    // Find the selected claim
    const selectedClaim = formOptions.claims.find(c => c.id === parseInt(claimId));
    
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.appointmentDate || !formData.startTime || !formData.endTime || 
          !formData.appointmentType || !formData.claimantId || 
          !formData.claimId || !formData.interpreterType || !formData.serviceType) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate location fields for non-remote appointments
      if (!formData.isRemote && (!formData.locationAddress || !formData.locationCity || 
          !formData.locationState || !formData.locationZipCode)) {
        toast.error('Please fill in all location fields for in-person appointments');
        setLoading(false);
        return;
      }

      // Validate time range
      if (formData.startTime >= formData.endTime) {
        toast.error('End time must be after start time');
        setLoading(false);
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
        // Include all claimant details for reference
        claimantName: formData.claimantName,
        claimantAddress: formData.claimantAddress,
        claimantCity: formData.claimantCity,
        claimantState: formData.claimantState,
        claimantZipCode: formData.claimantZipCode,
        dateOfBirth: formData.dateOfBirth,
        dateOfInjury: formData.dateOfInjury,
        claimantPhone: formData.claimantPhone,
        employer: formData.employer,
        examiner: formData.examiner,
        language: formData.language,
        interpreterType: formData.interpreterType,
        specialRequirements: formData.specialRequirements,
        appointmentNotes: formData.appointmentNotes // Include appointment notes
      };

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments/simple`,
        {
          method: 'POST',
          body: JSON.stringify(appointmentData)
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment request submitted successfully!');
        navigate('/appointments');
      } else {
        toast.error(data.message || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
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
                Schedule New Appointment
              </h1>
              <p className="mt-2 text-gray-600">Request an interpreter for a new appointment</p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow"
        >
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Appointment Details */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                Appointment Details
              </h3>
              
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
                  label="Appointment Notes"
                  value={formData.appointmentNotes || ''}
                  onChange={(e) => handleInputChange('appointmentNotes', e.target.value)}
                  placeholder="Additional details about the appointment..."
                />
                
                <Input
                  label="Doctor Name"
                  value={formData.doctorName}
                  onChange={(e) => handleInputChange('doctorName', e.target.value)}
                  placeholder="e.g., Dr. La Pilusa"
                />
              </div>
            </div>

            {/* Location */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
                Location
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRemote"
                    checked={formData.isRemote}
                    onChange={(e) => handleInputChange('isRemote', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRemote" className="ml-2 block text-sm text-gray-900">
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
                    
                    <div>
                      <Input
                        label="ZIP Code"
                        value={formData.locationZipCode}
                        onChange={(e) => handleInputChange('locationZipCode', e.target.value)}
                        placeholder="ZIP Code"
                        required
                      />
                    </div>
                    
                    <div>
                      <Input
                        label="Phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="e.g., 619.281.6414"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interpreter Requirements */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <LanguageIcon className="h-5 w-5 mr-2 text-blue-600" />
                Interpreter Requirements
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SearchableSelect
                  label="Language"
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  options={formOptions.languages.map(lang => ({ value: lang.id, label: lang.name }))}
                  placeholder="Select language"
                  required
                />
                
                <SearchableSelect
                  label="Service Type"
                  value={formData.serviceType}
                  onChange={(e) => handleInputChange('serviceType', e.target.value)}
                  options={formOptions.serviceTypes.map(type => ({
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
                  options={formOptions.interpreterTypes.map(type => ({
                    value: type.id.toString(),
                    label: type.name
                  }))}
                  placeholder="Select interpreter type"
                  required
                />
                
                <div className="md:col-span-2">
                  <Input
                    label="Special Requirements"
                    value={formData.specialRequirements}
                    onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    placeholder="Any special requirements or notes"
                  />
                </div>
              </div>
            </div>

            {/* Claimant Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                Claimant Information
              </h3>
              
              {/* Claimant & Claim Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <SearchableSelect
                    label="Select Claimant"
                    value={formData.claimantId}
                    onChange={(e) => handleClaimantChange(e.target.value)}
                    options={formOptions.claimants.map(claimant => ({
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
                    options={formOptions.claims.map(claim => ({
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">
                      Claimant Information Auto-filled
                    </span>
                  </div>
                  <p className="text-xs text-blue-600">
                    The claimant's information has been automatically populated below. You can review and modify if needed.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="First Name"
                  value={formData.claimantFirstName}
                  onChange={(e) => handleInputChange('claimantFirstName', e.target.value)}
                  placeholder="e.g., Stephanie"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Last Name"
                  value={formData.claimantLastName}
                  onChange={(e) => handleInputChange('claimantLastName', e.target.value)}
                  placeholder="e.g., Duffy"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <SearchableSelect
                  label="Gender"
                  value={formData.claimantGender}
                  onChange={(e) => handleInputChange('claimantGender', e.target.value)}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' }
                  ]}
                  placeholder="Select gender"
                  required
                  disabled={!!formData.claimantId}
                />
                
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.claimantDateOfBirth}
                  onChange={(e) => handleInputChange('claimantDateOfBirth', e.target.value)}
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.claimantPhone}
                  onChange={(e) => handleInputChange('claimantPhone', e.target.value)}
                  placeholder="e.g., (619)221-3162"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Language"
                  value={formData.claimantLanguage}
                  onChange={(e) => handleInputChange('claimantLanguage', e.target.value)}
                  placeholder="e.g., Spanish"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={formData.claimantAddress}
                    onChange={(e) => handleInputChange('claimantAddress', e.target.value)}
                    placeholder="e.g., 950 Park Blvd"
                    required
                    readOnly={!!formData.claimantId}
                  />
                </div>
                
                <Input
                  label="Employer/Insured"
                  value={formData.claimantEmployerInsured}
                  onChange={(e) => handleInputChange('claimantEmployerInsured', e.target.value)}
                  placeholder="e.g., Episcopal Community Services"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                {/* Show coordinates if available */}
                {(formData.claimantAddressLatitude || formData.claimantAddressLongitude) && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">
                      <strong>Coordinates:</strong> {formData.claimantAddressLatitude}, {formData.claimantAddressLongitude}
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default NewAppointment;
