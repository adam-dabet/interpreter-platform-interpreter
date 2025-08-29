import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon
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

const Input = ({ value, onChange, placeholder, type = 'text', className = '', label, required = false }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
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

const Textarea = ({ value, onChange, placeholder, className = '', label, required = false, rows = 3 }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

const Claimants = ({ setCurrentView }) => {
  const [claimants, setClaimants] = useState([]);
  const [billingAccounts, setBillingAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [editingClaimant, setEditingClaimant] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [selectedClaimant, setSelectedClaimant] = useState(null);
  const [expandedClaimant, setExpandedClaimant] = useState(null);
  const [claimantFormData, setClaimantFormData] = useState({
    name: '',
    gender: '',
    date_of_birth: '',
    phone: '',
    language: '',
    billing_account_id: '',
    address: ''
  });
  const [claimFormData, setClaimFormData] = useState({
    case_type: '',
    claim_number: '',
    date_of_injury: '',
    diagnosis: ''
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

  useEffect(() => {
    loadClaimants();
    loadBillingAccounts();
  }, []);

  const loadClaimants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/claimants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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
  };

  const loadBillingAccounts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/billing-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBillingAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading billing accounts:', error);
    }
  };

  const loadClaimantWithClaims = async (claimantId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/claimants/${claimantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Error loading claimant details:', error);
    }
    return null;
  };

  const handleClaimantSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingClaimant 
        ? `${API_BASE}/admin/claimants/${editingClaimant.id}`
        : `${API_BASE}/admin/claimants`;
      
      const response = await fetch(url, {
        method: editingClaimant ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(claimantFormData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowModal(false);
        setEditingClaimant(null);
        resetClaimantForm();
        loadClaimants();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save claimant');
      }
    } catch (error) {
      console.error('Error saving claimant:', error);
      toast.error('Failed to save claimant');
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingClaim 
        ? `${API_BASE}/admin/claims/${editingClaim.id}`
        : `${API_BASE}/admin/claims`;
      
      const requestBody = editingClaim 
        ? claimFormData 
        : { ...claimFormData, claimant_id: selectedClaimant.id };
      
      const response = await fetch(url, {
        method: editingClaim ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowClaimModal(false);
        setEditingClaim(null);
        resetClaimForm();
        
        // Refresh the expanded claimant's claims
        if (expandedClaimant) {
          const updatedClaimant = await loadClaimantWithClaims(expandedClaimant.id);
          if (updatedClaimant) {
            setClaimants(prev => prev.map(c => 
              c.id === expandedClaimant.id 
                ? { ...c, claims: updatedClaimant.claims, claims_count: updatedClaimant.claims.length }
                : c
            ));
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save claim');
      }
    } catch (error) {
      console.error('Error saving claim:', error);
      toast.error('Failed to save claim');
    }
  };

  const handleDeleteClaimant = async (claimantId) => {
    if (!window.confirm('Are you sure you want to delete this claimant? This will also delete all associated claims. This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/claimants/${claimantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Claimant deleted successfully');
        loadClaimants();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete claimant');
      }
    } catch (error) {
      console.error('Error deleting claimant:', error);
      toast.error('Failed to delete claimant');
    }
  };

  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/claims/${claimId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Claim deleted successfully');
        
        // Refresh the expanded claimant's claims
        if (expandedClaimant) {
          const updatedClaimant = await loadClaimantWithClaims(expandedClaimant.id);
          if (updatedClaimant) {
            setClaimants(prev => prev.map(c => 
              c.id === expandedClaimant.id 
                ? { ...c, claims: updatedClaimant.claims, claims_count: updatedClaimant.claims.length }
                : c
            ));
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete claim');
      }
    } catch (error) {
      console.error('Error deleting claim:', error);
      toast.error('Failed to delete claim');
    }
  };

  const handleEditClaimant = (claimant) => {
    setEditingClaimant(claimant);
    setClaimantFormData({
      name: claimant.name || '',
      gender: claimant.gender || '',
      date_of_birth: claimant.date_of_birth || '',
      phone: claimant.phone || '',
      language: claimant.language || '',
      billing_account_id: claimant.billing_account_id ? claimant.billing_account_id.toString() : '',
      address: claimant.address || ''
    });
    setShowModal(true);
  };

  const handleEditClaim = (claim) => {
    setEditingClaim(claim);
    setClaimFormData({
      case_type: claim.case_type || '',
      claim_number: claim.claim_number || '',
      date_of_injury: claim.date_of_injury || '',
      diagnosis: claim.diagnosis || ''
    });
    setShowClaimModal(true);
  };

  const handleCreateClaimant = () => {
    setEditingClaimant(null);
    resetClaimantForm();
    setShowModal(true);
  };

  const handleCreateClaim = (claimant) => {
    setSelectedClaimant(claimant);
    setEditingClaim(null);
    resetClaimForm();
    setShowClaimModal(true);
  };

  const toggleClaimantExpansion = async (claimant) => {
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
              ? { ...c, claims: claimantWithClaims.claims }
              : c
          ));
        }
      }
    }
  };

  const resetClaimantForm = () => {
    setClaimantFormData({
      name: '',
      gender: '',
      date_of_birth: '',
      phone: '',
      language: '',
      billing_account_id: '',
      address: ''
    });
  };

  const resetClaimForm = () => {
    setClaimFormData({
      case_type: '',
      claim_number: '',
      date_of_injury: '',
      diagnosis: ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredClaimants = claimants.filter(claimant =>
    claimant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claimant.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claimant.language?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claimant.billing_account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserIcon className="h-8 w-8 mr-3 text-blue-600" />
            Claimants
          </h1>
          <p className="mt-2 text-gray-600">Manage claimants and their associated claims</p>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleCreateClaimant}
              variant="primary"
              className="flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Claimant
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search claimants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Claimants List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredClaimants.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No claimants found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new claimant.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaimants.map((claimant) => (
              <motion.div
                key={claimant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
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
                        <h3 className="text-lg font-semibold text-gray-900">{claimant.name}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          {claimant.gender && <span>{claimant.gender}</span>}
                          {claimant.date_of_birth && (
                            <span className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {formatDate(claimant.date_of_birth)}
                            </span>
                          )}
                          {claimant.claims_count > 0 && (
                            <span className="flex items-center">
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              {claimant.claims_count} claim{claimant.claims_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleCreateClaim(claimant)}
                        variant="success"
                        className="text-sm"
                      >
                        Add Claim
                      </Button>
                      <button
                        onClick={() => handleEditClaimant(claimant)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Claimant"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClaimant(claimant.id)}
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
                        <PhoneIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{claimant.phone}</p>
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
                        <p className="text-sm text-gray-600 truncate">{claimant.address}</p>
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
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditClaim(claim)}
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
                          <Button
                            onClick={() => handleCreateClaim(claimant)}
                            variant="primary"
                            className="mt-2"
                          >
                            Add First Claim
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Claimant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClaimant ? 'Edit Claimant' : 'Add New Claimant'}
              </h3>
              
              <form onSubmit={handleClaimantSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={claimantFormData.name}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter claimant name"
                  required
                />
                
                <Select
                  label="Gender"
                  value={claimantFormData.gender}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, gender: e.target.value }))}
                  options={genderOptions}
                  placeholder="Select gender"
                />
                
                <Input
                  label="Date of Birth"
                  type="date"
                  value={claimantFormData.date_of_birth}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
                
                <Input
                  label="Phone Number"
                  value={claimantFormData.phone}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
                
                <Input
                  label="Language"
                  value={claimantFormData.language}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, language: e.target.value }))}
                  placeholder="Preferred language"
                />
                
                <Select
                  label="Billing Account"
                  value={claimantFormData.billing_account_id}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, billing_account_id: e.target.value }))}
                  options={billingAccounts.map(account => ({ 
                    value: account.id.toString(), 
                    label: account.name 
                  }))}
                  placeholder="Select billing account"
                />
                
                <Textarea
                  label="Address"
                  value={claimantFormData.address}
                  onChange={(e) => setClaimantFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                />
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingClaimant(null);
                      resetClaimantForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    {editingClaimant ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClaim ? 'Edit Claim' : 'Add New Claim'}
                {selectedClaimant && !editingClaim && (
                  <span className="block text-sm text-gray-600 mt-1">
                    for {selectedClaimant.name}
                  </span>
                )}
              </h3>
              
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <Select
                  label="Case Type"
                  value={claimFormData.case_type}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, case_type: e.target.value }))}
                  options={caseTypeOptions}
                  placeholder="Select case type"
                  required
                />
                
                <Input
                  label="Claim Number"
                  value={claimFormData.claim_number}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, claim_number: e.target.value }))}
                  placeholder="Enter claim number"
                  required
                />
                
                <Input
                  label="Date of Injury"
                  type="date"
                  value={claimFormData.date_of_injury}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, date_of_injury: e.target.value }))}
                />
                
                <Textarea
                  label="Diagnosis"
                  value={claimFormData.diagnosis}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis or description"
                  rows={3}
                />
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowClaimModal(false);
                      setEditingClaim(null);
                      setSelectedClaimant(null);
                      resetClaimForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    {editingClaim ? 'Update' : 'Create'}
                  </Button>
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
