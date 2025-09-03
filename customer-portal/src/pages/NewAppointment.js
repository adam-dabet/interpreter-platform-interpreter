import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  CalendarIcon, 
  MapPinIcon,
  UserIcon,
  DocumentTextIcon,
  LanguageIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

const Select = ({ value, onChange, options = [], placeholder, className = '', label, required = false, disabled = false }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
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

  const selectedOption = options && Array.isArray(options) ? options.find(option => option.value === value) : null;

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
  const [formOptions, setFormOptions] = useState({
    claimants: [],
    claims: []
  });
  const [formData, setFormData] = useState({
    // Appointment Details
    appointmentDate: '',
    startTime: '',
    endTime: '',
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
    claimantName: '',
    claimantAddress: '',
    claimantCity: '',
    claimantState: '',
    claimantZipCode: '',
    dateOfBirth: '',
    dateOfInjury: '',
    claimantPhone: '',
    
    // Employer & Examiner
    employer: '',
    examiner: '',
    
    // Interpreter Requirements
    language: 'Spanish',
    specialRequirements: ''
  });

  const loadFormOptions = useCallback(async () => {
    try {
      const claimantsResponse = await makeAuthenticatedRequest(`${API_BASE}/customer/claimants`);
      const claimantsData = await claimantsResponse.json();

      setFormOptions({
        claimants: claimantsData.data || [],
        claims: []
      });
    } catch (error) {
      console.error('Error loading form options:', error);
      toast.error('Failed to load form options');
    }
  }, [makeAuthenticatedRequest]);

  const loadClaimsForClaimant = useCallback(async (claimantId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/claims?claimantId=${claimantId}`
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
  }, [loadFormOptions]);

  useEffect(() => {
    // Load claims when claimant is selected
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

  const handleClaimantChange = (claimantId) => {
    if (!claimantId) {
      // Clear all claimant data if no claimant selected
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
        examiner: ''
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
        // Name - use first_name + last_name if available, fallback to name field
        claimantName: selectedClaimant.first_name && selectedClaimant.last_name 
          ? `${selectedClaimant.first_name} ${selectedClaimant.last_name}`
          : selectedClaimant.name || '',
        // Address - use the address field
        claimantAddress: selectedClaimant.address || '',
        // City, State, ZIP - use the new separate fields
        claimantCity: selectedClaimant.city || '',
        claimantState: selectedClaimant.state || '',
        claimantZipCode: selectedClaimant.zip_code || '',
        // Other fields - format dates properly
        dateOfBirth: formatDateForInput(selectedClaimant.date_of_birth),
        dateOfInjury: formatDateForInput(selectedClaimant.date_of_injury),
        claimantPhone: selectedClaimant.phone || '',
        employer: selectedClaimant.employer || '',
        examiner: selectedClaimant.examiner || ''
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
      examiner: ''
    }));
    setFormOptions(prev => ({ ...prev, claims: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.appointmentDate || !formData.startTime || !formData.endTime || 
          !formData.doctorName || !formData.claimantId || !formData.employer || !formData.examiner) {
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
        doctorName: formData.doctorName,
        isRemote: formData.isRemote,
        locationAddress: formData.locationAddress,
        locationCity: formData.locationCity,
        locationState: formData.locationState,
        locationZipCode: formData.locationZipCode,
        phone: formData.phone,
        claimantId: parseInt(formData.claimantId),
        claimId: formData.claimId ? parseInt(formData.claimId) : null,
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
        specialRequirements: formData.specialRequirements
      };

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments`,
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
            {/* Claimant & Claim Selection */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                Select Claimant & Claim
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <SearchableSelect
                    label="Claimant"
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
                  <Select
                    label="Claim (Optional)"
                    value={formData.claimId}
                    onChange={(e) => handleClaimChange(e.target.value)}
                    options={formOptions.claims.map(claim => ({
                      value: claim.id.toString(),
                      label: `${claim.claim_number} - ${claim.case_type}`
                    }))}
                    placeholder={formData.claimantId ? "Select a claim" : "Select claimant first"}
                    disabled={!formData.claimantId}
                  />
                </div>
              </div>
              
              {formData.claimantId && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
            </div>

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
                  label="Doctor Name"
                  value={formData.doctorName}
                  onChange={(e) => handleInputChange('doctorName', e.target.value)}
                  placeholder="e.g., Dr. La Pilusa"
                  required
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
                      <Input
                        label="Address"
                        value={formData.locationAddress}
                        onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                        placeholder="Street address"
                        required
                      />
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
                <Input
                  label="Language"
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  placeholder="e.g., Spanish"
                  required
                />
                
                <Input
                  label="Special Requirements"
                  value={formData.specialRequirements}
                  onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                  placeholder="Any special requirements or notes"
                />
              </div>
            </div>

            {/* Claimant Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                Claimant Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Name"
                  value={formData.claimantName}
                  onChange={(e) => handleInputChange('claimantName', e.target.value)}
                  placeholder="e.g., Stephanie Duffy"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Date of Injury"
                  type="date"
                  value={formData.dateOfInjury}
                  onChange={(e) => handleInputChange('dateOfInjury', e.target.value)}
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
                  label="City"
                  value={formData.claimantCity}
                  onChange={(e) => handleInputChange('claimantCity', e.target.value)}
                  placeholder="e.g., San Diego"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="State"
                  value={formData.claimantState}
                  onChange={(e) => handleInputChange('claimantState', e.target.value)}
                  placeholder="e.g., CA"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="ZIP Code"
                  value={formData.claimantZipCode}
                  onChange={(e) => handleInputChange('claimantZipCode', e.target.value)}
                  placeholder="e.g., 92101"
                  required
                  readOnly={!!formData.claimantId}
                />
              </div>
            </div>

            {/* Employer & Examiner */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Employer & Examiner
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Employer"
                  value={formData.employer}
                  onChange={(e) => handleInputChange('employer', e.target.value)}
                  placeholder="e.g., Episcopal Community Services"
                  required
                  readOnly={!!formData.claimantId}
                />
                
                <Input
                  label="Examiner"
                  value={formData.examiner}
                  onChange={(e) => handleInputChange('examiner', e.target.value)}
                  placeholder="e.g., Frank Vega"
                  required
                  readOnly={!!formData.claimantId}
                />
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
