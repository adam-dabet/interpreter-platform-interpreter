import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, CalendarIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// UI Components
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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

const Claimants = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const [claimants, setClaimants] = useState([]);
  const [billingAccounts, setBillingAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClaimant, setEditingClaimant] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaimantForClaim, setSelectedClaimantForClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [expandedClaimant, setExpandedClaimant] = useState(null);
  const [mapsInitialized, setMapsInitialized] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);
  const autocompleteRef = useRef(null);
  const [claimFormData, setClaimFormData] = useState({
    case_type: '',
    claim_number: '',
    date_of_injury: '',
    diagnosis: '',
    contact_claims_handler_id: '',
    adjusters_assistant_id: ''
  });

  const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
    { value: 'Prefer not to say', label: 'Prefer not to say' }
  ];

  const caseTypeOptions = [
    { value: 'Workers Compensation', label: 'Workers Compensation' },
    { value: 'Personal Injury', label: 'Personal Injury' },
    { value: 'Medical Malpractice', label: 'Medical Malpractice' },
    { value: 'Auto Accident', label: 'Auto Accident' },
    { value: 'Slip and Fall', label: 'Slip and Fall' },
    { value: 'Product Liability', label: 'Product Liability' },
    { value: 'Other', label: 'Other' }
  ];
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    phone: '',
    language: '',
    billing_account_id: '',
    address: '',
    address_latitude: '',
    address_longitude: '',
    employer_insured: '',
    city: '',
    state: '',
    zip_code: '',
    date_of_injury: '',
    employer: '',
    examiner: '',
    is_active: true
  });

  const loadClaimants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/claimants`);
      const data = await response.json();
      
      if (data.success) {
        setClaimants(data.data || []);
      } else {
        toast.error('Failed to load claimants');
      }
    } catch (error) {
      console.error('Error loading claimants:', error);
      toast.error('Failed to load claimants');
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const loadBillingAccounts = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/billing-accounts`);
      const data = await response.json();
      
      if (data.success) {
        setBillingAccounts(data.data || []);
        // Automatically set the billing account ID if not already set
        if (data.data && data.data.length > 0 && data.data[0] && !formData.billing_account_id) {
          setFormData(prev => ({
            ...prev,
            billing_account_id: data.data[0].id.toString()
          }));
        }
      }
    } catch (error) {
      console.error('Error loading billing accounts:', error);
    }
  }, [makeAuthenticatedRequest, formData.billing_account_id]);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/customers`);
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    loadClaimants();
    loadBillingAccounts();
    loadCustomers();
    initializeGoogleMaps();
  }, [loadClaimants, loadBillingAccounts, loadCustomers]);

  const initializeGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapsInitialized(true);
    } else {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.warn('Google Maps API key not found. Address autocomplete will be disabled.');
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapsInitialized(true);
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    }
  };

  const setupAddressAutocomplete = (inputElement) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    // Prevent multiple initializations
    if (autocompleteRef.current) {
      return;
    }

    const autocompleteInstance = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      componentRestrictions: { country: 'us' }
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address || '',
          address_latitude: lat.toString(),
          address_longitude: lng.toString()
        }));
      }
    });

    autocompleteRef.current = autocompleteInstance;
    setAutocomplete(autocompleteInstance);
  };

  const loadClaimantWithClaims = useCallback(async (claimantId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/customer/claimants/${claimantId}/claims`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('Error loading claimant details:', error);
    }
    return null;
  }, [makeAuthenticatedRequest]);

  const toggleClaimantExpansion = useCallback(async (claimant) => {
    if (expandedClaimant && expandedClaimant.id === claimant.id) {
      setExpandedClaimant(null);
    } else {
      setExpandedClaimant(claimant);
      
      // Load claims if not already loaded
      if (!claimant.claims) {
        const claimantWithClaims = await loadClaimantWithClaims(claimant.id);
        if (claimantWithClaims) {
          setClaimants(prev => prev.map(c => 
            c.id === claimant.id 
              ? { ...c, claims: claimantWithClaims }
              : c
          ));
        }
      }
    }
  }, [expandedClaimant, loadClaimantWithClaims]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      phone: '',
      language: '',
      billing_account_id: billingAccounts && billingAccounts.length > 0 && billingAccounts[0] ? billingAccounts[0].id.toString() : '',
      address: '',
      address_latitude: '',
      address_longitude: '',
      employer_insured: '',
      city: '',
      state: '',
      zip_code: '',
      date_of_injury: '',
      employer: '',
      examiner: '',
      is_active: true
    });
    setEditingClaimant(null);
  };

  const openCreateModal = () => {
    // Reset autocomplete ref for new claimant
    autocompleteRef.current = null;
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (claimant) => {
    // Reset autocomplete ref for new claimant
    autocompleteRef.current = null;
    setFormData({
      first_name: claimant.first_name || '',
      last_name: claimant.last_name || '',
      gender: claimant.gender || '',
      date_of_birth: claimant.date_of_birth ? claimant.date_of_birth.split('T')[0] : '',
      phone: claimant.phone || '',
      language: claimant.language || '',
      billing_account_id: claimant.billing_account_id ? claimant.billing_account_id.toString() : '',
      address: claimant.address || '',
      address_latitude: claimant.address_latitude || '',
      address_longitude: claimant.address_longitude || '',
      employer_insured: claimant.employer_insured || '',
      city: claimant.city || '',
      state: claimant.state || '',
      zip_code: claimant.zip_code || '',
      date_of_injury: claimant.date_of_injury ? claimant.date_of_injury.split('T')[0] : '',
      employer: claimant.employer || '',
      examiner: claimant.examiner || '',
      is_active: claimant.is_active !== undefined ? claimant.is_active : true
    });
    setEditingClaimant(claimant);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    // Reset autocomplete ref when closing modal
    autocompleteRef.current = null;
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingClaimant 
        ? `${API_BASE}/customer/claimants/${editingClaimant.id}`
        : `${API_BASE}/customer/claimants`;
      
      const method = editingClaimant ? 'PUT' : 'POST';
      
      const response = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingClaimant ? 'Claimant updated successfully' : 'Claimant created successfully');
        closeModal();
        loadClaimants();
      } else {
        toast.error(data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving claimant:', error);
      toast.error('Failed to save claimant');
    }
  };

  const handleDelete = async (claimantId) => {
    if (!window.confirm('Are you sure you want to delete this claimant?')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/claimants/${claimantId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Claimant deleted successfully');
        loadClaimants();
      } else {
        toast.error(data.message || 'Failed to delete claimant');
      }
    } catch (error) {
      console.error('Error deleting claimant:', error);
      toast.error('Failed to delete claimant');
    }
  };

  const openCreateClaimModal = (claimant) => {
    setSelectedClaimantForClaim(claimant);
    setEditingClaim(null);
    setClaimFormData({
      case_type: '',
      claim_number: '',
      date_of_injury: '',
      diagnosis: '',
      contact_claims_handler_id: '',
      adjusters_assistant_id: ''
    });
    setShowClaimModal(true);
  };

  const openEditClaimModal = (claim) => {
    setEditingClaim(claim);
    setSelectedClaimantForClaim(null);
    setClaimFormData({
      case_type: claim.case_type || '',
      claim_number: claim.claim_number || '',
      date_of_injury: claim.date_of_injury ? claim.date_of_injury.split('T')[0] : '',
      diagnosis: claim.diagnosis || '',
      contact_claims_handler_id: claim.contact_claims_handler_id ? claim.contact_claims_handler_id.toString() : '',
      adjusters_assistant_id: claim.adjusters_assistant_id ? claim.adjusters_assistant_id.toString() : ''
    });
    setShowClaimModal(true);
  };

  const closeClaimModal = () => {
    setShowClaimModal(false);
    setSelectedClaimantForClaim(null);
    setEditingClaim(null);
    setClaimFormData({
      case_type: '',
      claim_number: '',
      date_of_injury: '',
      diagnosis: '',
      contact_claims_handler_id: '',
      adjusters_assistant_id: ''
    });
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingClaim 
        ? `${API_BASE}/customer/claims/${editingClaim.id}`
        : `${API_BASE}/customer/claims`;
      
      const requestBody = editingClaim 
        ? claimFormData 
        : { ...claimFormData, claimant_id: selectedClaimantForClaim.id };
      
      const response = await makeAuthenticatedRequest(url, {
        method: editingClaim ? 'PUT' : 'POST',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingClaim ? 'Claim updated successfully' : 'Claim created successfully');
        closeClaimModal();
        
        // Refresh the expanded claimant's claims
        if (expandedClaimant) {
          const updatedClaimant = await loadClaimantWithClaims(expandedClaimant.id);
          if (updatedClaimant) {
            setClaimants(prev => prev.map(c => 
              c.id === expandedClaimant.id 
                ? { ...c, claims: updatedClaimant }
                : c
            ));
          }
        }
      } else {
        toast.error(data.message || 'Failed to save claim');
      }
    } catch (error) {
      console.error('Error saving claim:', error);
      toast.error('Failed to save claim');
    }
  };

  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/claims/${claimId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Claim deleted successfully');
        
        // Refresh the expanded claimant's claims
        if (expandedClaimant) {
          const updatedClaimant = await loadClaimantWithClaims(expandedClaimant.id);
          if (updatedClaimant) {
            setClaimants(prev => prev.map(c => 
              c.id === expandedClaimant.id 
                ? { ...c, claims: updatedClaimant }
                : c
            ));
          }
        }
      } else {
        toast.error(data.message || 'Failed to delete claim');
      }
    } catch (error) {
      console.error('Error deleting claim:', error);
      toast.error('Failed to delete claim');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading claimants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claimants</h1>
            <p className="mt-2 text-gray-600">
              Manage claimants in your billing account
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Claimant
          </button>
        </div>

        {/* Claimants List */}
        {claimants.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No claimants</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new claimant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {claimants.map((claimant) => (
              <div key={claimant.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Claimant Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleClaimantExpansion(claimant)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {expandedClaimant && expandedClaimant.id === claimant.id ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {claimant.first_name && claimant.last_name 
                            ? `${claimant.first_name} ${claimant.last_name}`
                            : claimant.name || 'Unnamed Claimant'
                          }
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          {claimant.gender && <span>{claimant.gender}</span>}
                          {claimant.date_of_birth && (
                            <span className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {formatDate(claimant.date_of_birth)}
                            </span>
                          )}
                          {claimant.claims && claimant.claims.length > 0 && (
                            <span className="flex items-center">
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              {claimant.claims.length} claim{claimant.claims.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openCreateClaimModal(claimant)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Claim
                      </button>
                      <button
                        onClick={() => openEditModal(claimant)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Claimant"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(claimant.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Claimant"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Claimant Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {claimant.phone && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">Phone: {claimant.phone}</span>
                      </div>
                    )}
                    
                    {claimant.language && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">Language: {claimant.language}</span>
                      </div>
                    )}
                    
                    {claimant.billing_account_name && (
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{claimant.billing_account_name}</p>
                      </div>
                    )}
                    
                    {claimant.address && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="text-sm text-gray-600">
                          <p className="truncate">{claimant.address}</p>
                          {claimant.address_latitude && claimant.address_longitude && (
                            <p className="text-xs text-gray-400">
                              {claimant.address_latitude}, {claimant.address_longitude}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {claimant.employer_insured && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">Employer/Insured: {claimant.employer_insured}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Claims Section */}
                {expandedClaimant && expandedClaimant.id === claimant.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Claims</h4>
                      
                      {claimant.claims && claimant.claims.length > 0 ? (
                        <div className="space-y-3">
                          {claimant.claims.map((claim) => (
                            <div key={claim.id} className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    <h5 className="font-medium text-gray-900">{claim.claim_number}</h5>
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {claim.case_type}
                                    </span>
                                  </div>
                                  {claim.date_of_injury && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Date of Injury: {formatDate(claim.date_of_injury)}
                                    </p>
                                  )}
                                  {claim.diagnosis && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Diagnosis: {claim.diagnosis}
                                    </p>
                                  )}
                                  {claim.contact_claims_handler_name && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Contact: {claim.contact_claims_handler_name}
                                    </p>
                                  )}
                                  {claim.adjusters_assistant_name && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Assistant: {claim.adjusters_assistant_name}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => openEditClaimModal(claim)}
                                    className="text-gray-600 hover:text-gray-900"
                                    title="Edit Claim"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClaim(claim.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete Claim"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No claims found for this claimant</p>
                          <button
                            onClick={() => openCreateClaimModal(claimant)}
                            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Add First Claim
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClaimant ? 'Edit Claimant' : 'Add New Claimant'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <SearchableSelect
                    label="Gender"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    options={genderOptions}
                    placeholder="Select gender"
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language</label>
                    <input
                      type="text"
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Billing Account</label>
                    <input
                      type="text"
                      value={billingAccounts && billingAccounts.length > 0 && billingAccounts[0] ? billingAccounts[0].name : 'Loading...'}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Automatically set to your billing account</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder={mapsInitialized ? "Start typing address for autocomplete..." : "Enter address manually"}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      ref={(input) => {
                        if (input && mapsInitialized && !autocompleteRef.current) {
                          setupAddressAutocomplete(input);
                        }
                      }}
                    />
                    {(formData.address_latitude && formData.address_longitude) && (
                      <div className="mt-2 text-xs text-gray-500">
                        Coordinates: {formData.address_latitude}, {formData.address_longitude}
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Employer/Insured</label>
                    <input
                      type="text"
                      value={formData.employer_insured}
                      onChange={(e) => handleInputChange('employer_insured', e.target.value)}
                      placeholder="Enter employer or insured party name (optional)"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingClaimant ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Claim Creation Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClaim ? 'Edit Claim' : 'Add New Claim'}
                {selectedClaimantForClaim && !editingClaim && (
                  <span className="block text-sm text-gray-600 mt-1">
                    for {selectedClaimantForClaim.first_name && selectedClaimantForClaim.last_name 
                      ? `${selectedClaimantForClaim.first_name} ${selectedClaimantForClaim.last_name}`
                      : selectedClaimantForClaim.name || 'Unnamed Claimant'
                    }
                  </span>
                )}
              </h3>
              
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SearchableSelect
                    label="Case Type"
                    value={claimFormData.case_type}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, case_type: e.target.value }))}
                    options={caseTypeOptions}
                    placeholder="Select case type"
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Claim Number *</label>
                    <input
                      type="text"
                      value={claimFormData.claim_number}
                      onChange={(e) => setClaimFormData(prev => ({ ...prev, claim_number: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Injury</label>
                    <input
                      type="date"
                      value={claimFormData.date_of_injury}
                      onChange={(e) => setClaimFormData(prev => ({ ...prev, date_of_injury: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                    <textarea
                      value={claimFormData.diagnosis}
                      onChange={(e) => setClaimFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="Enter diagnosis or description"
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <SearchableSelect
                    label="Contact/Claims Handler"
                    value={claimFormData.contact_claims_handler_id}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, contact_claims_handler_id: e.target.value }))}
                    options={customers.map(customer => ({ 
                      value: customer.id.toString(), 
                      label: customer.name 
                    }))}
                    placeholder="Select contact/claims handler"
                  />
                  
                  <SearchableSelect
                    label="Adjuster's Assistant"
                    value={claimFormData.adjusters_assistant_id}
                    onChange={(e) => setClaimFormData(prev => ({ ...prev, adjusters_assistant_id: e.target.value }))}
                    options={customers.map(customer => ({ 
                      value: customer.id.toString(), 
                      label: customer.name 
                    }))}
                    placeholder="Select adjuster's assistant (optional)"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeClaimModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingClaim ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claimants;
