import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  LanguageIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// UI Components
const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', className = '', label, required = false, id }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

const Select = ({ value, onChange, options = [], placeholder, className = '', label, required = false }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const SearchableSelect = ({ value, onChange, options = [], placeholder, className = '', label, required = false }) => {
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

  // Initialize search term when value changes (for edit mode)
  useEffect(() => {
    if (value && options && options.length > 0) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearchTerm(selectedOption.label || '');
      }
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

  const selectedOption = options && Array.isArray(options) ? options.find(option => option.value === value) : null;

  return (
    <div className={`relative searchable-select ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
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

const EditJob = ({ jobId, setCurrentView }) => {
  const [formData, setFormData] = useState({
    jobNumber: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    reserveHours: '',
    reserveMinutes: '',
    serviceType: '',
    language: '',
    interpreterType: '',
    claimantId: '',
    claimId: '',
    locationOfService: '',
    facilityPhone: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [interpreterTypes, setInterpreterTypes] = useState([]);
  const [claimants, setClaimants] = useState([]);
  const [claims, setClaims] = useState([]);
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapsInitialized, setMapsInitialized] = useState(false);

  useEffect(() => {
    loadJobDetails();
    loadFormOptions();
    
    // Only initialize Google Maps once
    if (!mapsInitialized) {
      initializeGoogleMaps();
    }
    
    // Cleanup function
    return () => {
      // Clean up any Google Maps related resources if needed
      if (autocomplete) {
        window.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, [mapsInitialized]);

  const initializeGoogleMaps = () => {
    // Prevent multiple initializations
    if (mapsInitialized) {
      return;
    }

    // Check if Google Maps API key is available
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      console.log('Google Maps API key not found. Location autocomplete will be disabled.');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setupGoogleMaps();
      setMapsInitialized(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Script is already being loaded, wait for it
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          setupGoogleMaps();
          setMapsInitialized(true);
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setupGoogleMaps();
      setMapsInitialized(true);
    };
    script.onerror = () => {
      console.log('Failed to load Google Maps API. Location will be saved as text only.');
    };
    document.head.appendChild(script);
  };

  const setupGoogleMaps = () => {
    try {
      // Check if Google Maps API is properly loaded
      if (!window.google || !window.google.maps) {
        console.log('Google Maps API not available. Location will be saved as text only.');
        return;
      }

      // Wait a bit for the API to fully initialize
      setTimeout(() => {
        try {
          // Create autocomplete for location input
          const locationInput = document.getElementById('locationOfService');
          if (locationInput) {
            const autocompleteInstance = new window.google.maps.places.Autocomplete(locationInput, {
              types: ['geocode'],
              componentRestrictions: { country: 'us' }
            });

            autocompleteInstance.addListener('place_changed', () => {
              const place = autocompleteInstance.getPlace();
              if (place.geometry) {
                const location = place.formatted_address;
                handleInputChange('locationOfService', location);
              }
            });

            setAutocomplete(autocompleteInstance);
          }
        } catch (error) {
          console.error('Error setting up Google Maps autocomplete:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in setupGoogleMaps:', error);
    }
  };

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const job = data.data;
        
        console.log('Job data received:', job);
        
        // Convert job data to form format
        const hours = Math.floor(job.estimated_duration_minutes / 60);
        const minutes = job.estimated_duration_minutes % 60;
        
        // Use the stored appointment_type if available, otherwise fall back to mapping from job_type
        let appointmentType = job.appointment_type || 'consultation'; // Use stored value or default
        
        // If no stored appointment_type, try to derive it from job_type (for backward compatibility)
        if (!job.appointment_type) {
          console.log('No stored appointment_type, deriving from job_type:', job.job_type);
          if (job.is_remote) {
            if (job.job_type === 'legal') {
              appointmentType = 'deposition_zoom';
            } else if (job.job_type === 'medical') {
              appointmentType = 'consult_telehealth';
            } else {
              appointmentType = 'video';
            }
          } else {
            if (job.job_type === 'legal') {
              appointmentType = 'deposition';
            } else if (job.job_type === 'medical') {
              appointmentType = 'consultation';
            } else {
              appointmentType = 'consultation';
            }
          }
        } else {
          console.log('Using stored appointment_type:', job.appointment_type);
        }
        
        // Format date for input field (YYYY-MM-DD)
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };

        const formDataToSet = {
          jobNumber: job.title || '',
          appointmentDate: formatDateForInput(job.scheduled_date),
          appointmentTime: job.scheduled_time ? job.scheduled_time.substring(0, 5) : '',
          appointmentType: appointmentType,
          reserveHours: hours.toString(),
          reserveMinutes: minutes.toString(),
          serviceType: job.service_type_id ? job.service_type_id.toString() : '',
          language: job.source_language_id || '',
          interpreterType: job.interpreter_type_id ? job.interpreter_type_id.toString() : '',
          claimantId: job.claimant_id ? job.claimant_id.toString() : '',
          claimId: job.claim_id ? job.claim_id.toString() : '',
          locationOfService: job.location_address || '',
          facilityPhone: job.facility_phone || ''
        };
        
        console.log('=== FORM LOADING DEBUG ===');
        console.log('Job data received:', job);
        console.log('Form data to set:', formDataToSet);
        console.log('appointmentType in formDataToSet:', formDataToSet.appointmentType);
        console.log('interpreterType in formDataToSet:', formDataToSet.interpreterType);
        console.log('=== END LOADING DEBUG ===');
        
        setFormData(formDataToSet);
        
        // Load claims if claimant is set
        if (job.claimant_id) {
          loadClaimsForClaimant(job.claimant_id.toString());
        }
      } else {
        toast.error('Failed to load job details');
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const loadFormOptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Load service types
      const serviceTypesResponse = await fetch(`${API_BASE}/parametric/service-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (serviceTypesResponse.ok) {
        const serviceTypesData = await serviceTypesResponse.json();
        console.log('Service types loaded:', serviceTypesData.data);
        setServiceTypes(serviceTypesData.data || []);
      }

      // Load languages
      const languagesResponse = await fetch(`${API_BASE}/parametric/languages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (languagesResponse.ok) {
        const languagesData = await languagesResponse.json();
        console.log('Languages loaded:', languagesData.data);
        setLanguages(languagesData.data || []);
      }

      // Load interpreter types
      const interpreterTypesResponse = await fetch(`${API_BASE}/parametric/interpreter-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (interpreterTypesResponse.ok) {
        const interpreterTypesData = await interpreterTypesResponse.json();
        console.log('Interpreter types loaded:', interpreterTypesData.data);
        setInterpreterTypes(interpreterTypesData.data || []);
      }

      // Load claimants
      const claimantsResponse = await fetch(`${API_BASE}/admin/claimants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (claimantsResponse.ok) {
        const claimantsData = await claimantsResponse.json();
        setClaimants(claimantsData.data || []);
      }
    } catch (error) {
      console.error('Error loading form options:', error);
      // Set empty arrays as fallback
      setServiceTypes([]);
      setLanguages([]);
      setInterpreterTypes([]);
      setClaimants([]);
    }
  };

  const loadClaimsForClaimant = async (claimantId) => {
    if (!claimantId) {
      setClaims([]);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/claimants/${claimantId}/claims`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClaims(data.data || []);
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Error loading claims:', error);
      setClaims([]);
    }
  };

  // Map appointment types to service types
  const getServiceTypeForAppointmentType = (appointmentType) => {
    // Medical appointment types
    const medicalTypes = [
      'acupuncture', 'ame', 'cardiac_evaluation', 'chiropractor', 'consult_treat', 'consultation',
      'ct_scan', 'dentist', 'diagnostic_testing', 'ekg', 'emg', 'epidural_injection', 'evaluation',
      'follow_up', 'follow_up_lab_work', 'follow_up_pt', 'functional_capacity', 'hearing_loss',
      'hernia_consult', 'ime', 'initial_appointment', 'injection', 'injection_steroid', 'internal_medicine',
      'laser_procedure', 'medical', 'medical_clerance', 'medical_procedure', 'mri', 'occupational',
      'one_time_appointment', 'orthopaedic', 'pain_management', 'physical_therapy', 'physical_therapy_initial',
      'psychological', 'qme', 'second_opinion', 'surgery', 'surgery_check_in', 'surgery_discharge',
      'surgery_post_op', 'surgery_pre_op', 'surgical_consult', 'vocational_evaluation', 'x_ray',
      'cognitive_behavioral_therapy'
    ];
    
    // Legal appointment types
    const legalTypes = [
      'deposition', 'deposition_zoom', 'legal', 'recorded_statement', 'settlement_documents',
      'status_conference', 'status_conference_remote', 'trial', 'mandatory_settlement_agreement',
      'hearing', 'mandatory_settlement_conference', 'permanent_stationary'
    ];
    
    // Telehealth appointment types
    const telehealthTypes = [
      'phone', 'video', 'consult_telehealth', 'follow_up_telehealth', 'medical_telehealth'
    ];
    
    if (medicalTypes.includes(appointmentType)) {
      return 'medical'; // Return the service type code for medical
    } else if (legalTypes.includes(appointmentType)) {
      return 'legal'; // Return the service type code for legal
    } else if (telehealthTypes.includes(appointmentType)) {
      return 'phone'; // Return the service type code for phone/telehealth
    }
    
    return 'other'; // Return 'other' for any appointment types that don't match the main categories
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-populate service type when appointment type changes
    if (field === 'appointmentType' && value) {
      console.log('Appointment type selected:', value);
      const serviceTypeCode = getServiceTypeForAppointmentType(value);
      console.log('Mapped service type code:', serviceTypeCode);
      console.log('Available service types:', serviceTypes);
      
      if (serviceTypeCode && serviceTypes.length > 0) {
        // Find the service type ID that matches the code
        const matchingServiceType = serviceTypes.find(st => st.code === serviceTypeCode);
        console.log('Matching service type:', matchingServiceType);
        
        if (matchingServiceType) {
          console.log('Auto-populating service type to:', matchingServiceType.id);
          setFormData(prev => ({
            ...prev,
            [field]: value,
            serviceType: matchingServiceType.id.toString()
          }));
          // Show a subtle notification that service type was auto-populated
          toast.success(`Service type automatically set to "${matchingServiceType.name}"`, {
            duration: 2000,
            position: 'top-right'
          });
          
          // Auto-populate interpreter type based on service type
          if (serviceTypeCode === 'legal' && interpreterTypes.length > 0) {
            const courtCertifiedType = interpreterTypes.find(it => it.code === 'court_certified');
            if (courtCertifiedType) {
              console.log('Auto-populating interpreter type to Court Certified');
              setFormData(prev => ({
                ...prev,
                interpreterType: courtCertifiedType.id.toString()
              }));
              toast.success(`Interpreter type automatically set to "${courtCertifiedType.name}"`, {
                duration: 2000,
                position: 'top-right'
              });
            }
          }
        }
      }
    }

    // Load claims when claimant is selected
    if (field === 'claimantId') {
      loadClaimsForClaimant(value);
      // Clear claim selection when claimant changes
      setFormData(prev => ({ ...prev, claimId: '' }));
    }
    
    // Auto-populate interpreter type when service type changes directly
    if (field === 'serviceType' && value) {
      console.log('Service type selected:', value);
      const selectedServiceType = serviceTypes.find(st => st.id.toString() === value);
      console.log('Selected service type:', selectedServiceType);
      
      if (selectedServiceType && selectedServiceType.code === 'legal' && interpreterTypes.length > 0) {
        const courtCertifiedType = interpreterTypes.find(it => it.code === 'court_certified');
        if (courtCertifiedType) {
          console.log('Auto-populating interpreter type to Court Certified');
          setFormData(prev => ({
            ...prev,
            interpreterType: courtCertifiedType.id.toString()
          }));
          toast.success(`Interpreter type automatically set to "${courtCertifiedType.name}"`, {
            duration: 2000,
            position: 'top-right'
          });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      
      // Combine hours and minutes into total minutes for the API
      const hours = parseInt(formData.reserveHours) || 0;
      const minutes = parseInt(formData.reserveMinutes) || 0;
      const totalReserveMinutes = (hours * 60) + minutes;
      
      // Create the data object to send to API
      const jobData = {
        ...formData,
        reserveTime: totalReserveMinutes.toString() // Convert to string for API
      };
      
      // Remove the separate hours and minutes fields from the data sent to API
      delete jobData.reserveHours;
      delete jobData.reserveMinutes;
      
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Original formData:', formData);
      console.log('Updating job with data:', jobData);
      console.log('appointmentType in jobData:', jobData.appointmentType);
      console.log('interpreterType in jobData:', jobData.interpreterType);
      console.log('=== END DEBUG ===');
      
      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Job updated successfully!');
        // Go back to job details
        setCurrentView('job-details', { jobId });
      } else {
        const error = await response.json();
        console.error('Job update error:', error);
        toast.error(error.message || 'Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setSaving(false);
    }
  };

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

  const reserveHoursOptions = [
    { value: '0', label: '0 hours' },
    { value: '1', label: '1 hour' },
    { value: '2', label: '2 hours' },
    { value: '3', label: '3 hours' },
    { value: '4', label: '4 hours' },
    { value: '5', label: '5 hours' },
    { value: '6', label: '6 hours' },
    { value: '7', label: '7 hours' },
    { value: '8', label: '8 hours' }
  ];

  const reserveMinutesOptions = [
    { value: '0', label: '0 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('job-details', { jobId })}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Job</h1>
                <p className="mt-2 text-gray-600">Update job information</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Job Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Job Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Job Number"
                  value={formData.jobNumber}
                  onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                  placeholder="Enter job number"
                  required
                />
                <SearchableSelect
                  label="Claimant"
                  value={formData.claimantId}
                  onChange={(e) => handleInputChange('claimantId', e.target.value)}
                  options={claimants.map(claimant => ({
                    value: claimant.id.toString(),
                    label: `${claimant.first_name && claimant.last_name 
                      ? `${claimant.first_name} ${claimant.last_name}`
                      : claimant.name || 'Unnamed Claimant'
                    }${claimant.language ? ` (${claimant.language})` : ''}`
                  }))}
                  placeholder="Select claimant"
                  required
                />
                <SearchableSelect
                  label="Claim"
                  value={formData.claimId}
                  onChange={(e) => handleInputChange('claimId', e.target.value)}
                  options={claims.map(claim => ({
                    value: claim.id.toString(),
                    label: `${claim.claim_number} - ${claim.case_type}`
                  }))}
                  placeholder={formData.claimantId ? "Select claim" : "Select claimant first"}
                  disabled={!formData.claimantId}
                />
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                Appointment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Appointment Date"
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                  required
                />
                <Input
                  label="Appointment Time"
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                  required
                />
                <SearchableSelect
                  label="Appointment Type"
                  value={formData.appointmentType}
                  onChange={(e) => handleInputChange('appointmentType', e.target.value)}
                  options={appointmentTypeOptions}
                  placeholder="Select appointment type"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <SearchableSelect
                    label="Reserve Hours"
                    value={formData.reserveHours}
                    onChange={(e) => handleInputChange('reserveHours', e.target.value)}
                    options={reserveHoursOptions}
                    placeholder="Hours"
                  />
                  <SearchableSelect
                    label="Reserve Minutes"
                    value={formData.reserveMinutes}
                    onChange={(e) => handleInputChange('reserveMinutes', e.target.value)}
                    options={reserveMinutesOptions}
                    placeholder="Minutes"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <LanguageIcon className="h-5 w-5 mr-2 text-blue-600" />
                Service Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <SearchableSelect
                    label="Service Type"
                    value={formData.serviceType}
                    onChange={(e) => handleInputChange('serviceType', e.target.value)}
                    options={serviceTypes.map(st => ({ 
                      value: st.id.toString(), 
                      label: `${st.name} - $${st.platform_rate_amount || 'N/A'}/${st.platform_rate_unit === 'minutes' ? 'min' : st.platform_rate_unit === 'word' ? 'word' : 'hr'}`
                    }))}
                    placeholder="Select service type"
                    required
                  />
                  {formData.serviceType && (() => {
                    const selectedServiceType = serviceTypes.find(st => st.id.toString() === formData.serviceType);
                    return selectedServiceType ? (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Rate:</span> ${selectedServiceType.platform_rate_amount || 'N/A'}/{selectedServiceType.platform_rate_unit === 'minutes' ? 'min' : selectedServiceType.platform_rate_unit === 'word' ? 'word' : 'hr'}
                        </p>
                        {selectedServiceType.platform_minimum_hours && (
                          <p className="text-xs text-blue-600 mt-1">
                            Minimum: {selectedServiceType.platform_minimum_hours} hours
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
                <SearchableSelect
                  label="Language"
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  options={languages.map(lang => ({ value: lang.id, label: lang.name }))}
                  placeholder="Select language"
                  required
                />
                <SearchableSelect
                  label="Interpreter Type"
                  value={formData.interpreterType}
                  onChange={(e) => handleInputChange('interpreterType', e.target.value)}
                  options={interpreterTypes.map(it => ({ value: it.id.toString(), label: it.name }))}
                  placeholder="Select interpreter type"
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
                Location
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="Location of Service"
                  value={formData.locationOfService}
                  onChange={(e) => handleInputChange('locationOfService', e.target.value)}
                  placeholder="Enter location (e.g., City, State or Full Address)"
                  required
                  id="locationOfService"
                />
                <Input
                  label="Facility Phone"
                  value={formData.facilityPhone}
                  onChange={(e) => handleInputChange('facilityPhone', e.target.value)}
                  placeholder="Enter facility phone number"
                  type="tel"
                  id="facilityPhone"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentView('job-details', { jobId })}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EditJob;
