import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
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

const Select = ({ value, onChange, options, placeholder, className = '', label, required = false }) => (
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
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const Interpreters = ({ setCurrentView }) => {
  const [interpreters, setInterpreters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInterpreter, setEditingInterpreter] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    state_id: '',
    zip_code: '',
    years_of_experience: '',
    hourly_rate: '',
    bio: '',
    languages: []
  });
  const [availableLanguages, setAvailableLanguages] = useState([]);

  // US States for dropdown
  const usStates = [
    { value: 1, label: 'Alabama' }, { value: 2, label: 'Alaska' }, { value: 3, label: 'Arizona' },
    { value: 4, label: 'Arkansas' }, { value: 5, label: 'California' }, { value: 6, label: 'Colorado' },
    { value: 7, label: 'Connecticut' }, { value: 8, label: 'Delaware' }, { value: 9, label: 'Florida' },
    { value: 10, label: 'Georgia' }, { value: 11, label: 'Hawaii' }, { value: 12, label: 'Idaho' },
    { value: 13, label: 'Illinois' }, { value: 14, label: 'Indiana' }, { value: 15, label: 'Iowa' },
    { value: 16, label: 'Kansas' }, { value: 17, label: 'Kentucky' }, { value: 18, label: 'Louisiana' },
    { value: 19, label: 'Maine' }, { value: 20, label: 'Maryland' }, { value: 21, label: 'Massachusetts' },
    { value: 22, label: 'Michigan' }, { value: 23, label: 'Minnesota' }, { value: 24, label: 'Mississippi' },
    { value: 25, label: 'Missouri' }, { value: 26, label: 'Montana' }, { value: 27, label: 'Nebraska' },
    { value: 28, label: 'Nevada' }, { value: 29, label: 'New Hampshire' }, { value: 30, label: 'New Jersey' },
    { value: 31, label: 'New Mexico' }, { value: 32, label: 'New York' }, { value: 33, label: 'North Carolina' },
    { value: 34, label: 'North Dakota' }, { value: 35, label: 'Ohio' }, { value: 36, label: 'Oklahoma' },
    { value: 37, label: 'Oregon' }, { value: 38, label: 'Pennsylvania' }, { value: 39, label: 'Rhode Island' },
    { value: 40, label: 'South Carolina' }, { value: 41, label: 'South Dakota' }, { value: 42, label: 'Tennessee' },
    { value: 43, label: 'Texas' }, { value: 44, label: 'Utah' }, { value: 45, label: 'Vermont' },
    { value: 46, label: 'Virginia' }, { value: 47, label: 'Washington' }, { value: 48, label: 'West Virginia' },
    { value: 49, label: 'Wisconsin' }, { value: 50, label: 'Wyoming' }
  ];

  useEffect(() => {
    loadInterpreters();
    loadLanguages();
  }, []);

  const loadInterpreters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/interpreters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInterpreters(data.data || []);
      } else {
        toast.error('Failed to load interpreters');
      }
    } catch (error) {
      console.error('Error loading interpreters:', error);
      toast.error('Failed to load interpreters');
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE}/parametric/languages`);
      
      if (response.ok) {
        const data = await response.json();
        setAvailableLanguages(data.data || []);
      } else {
        console.error('Failed to load languages');
      }
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingInterpreter 
        ? `${API_BASE}/admin/interpreters/${editingInterpreter.id}`
        : `${API_BASE}/admin/interpreters`;
      
      const response = await fetch(url, {
        method: editingInterpreter ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowModal(false);
        setEditingInterpreter(null);
        resetForm();
        loadInterpreters();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save interpreter');
      }
    } catch (error) {
      console.error('Error saving interpreter:', error);
      toast.error('Failed to save interpreter');
    }
  };

  const handleDelete = async (interpreterId) => {
    if (!window.confirm('Are you sure you want to delete this interpreter? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/interpreters/${interpreterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Interpreter deleted successfully');
        loadInterpreters();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete interpreter');
      }
    } catch (error) {
      console.error('Error deleting interpreter:', error);
      toast.error('Failed to delete interpreter');
    }
  };

  const handleEdit = (interpreter) => {
    setEditingInterpreter(interpreter);
    setFormData({
      first_name: interpreter.first_name || '',
      last_name: interpreter.last_name || '',
      email: interpreter.email || '',
      phone: interpreter.phone || '',
      street_address: interpreter.street_address || '',
      city: interpreter.city || '',
      state_id: interpreter.state_id || '',
      zip_code: interpreter.zip_code || '',
      years_of_experience: interpreter.years_of_experience || '',
      hourly_rate: interpreter.hourly_rate || '',
      bio: interpreter.bio || '',
      languages: interpreter.languages || []
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingInterpreter(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      street_address: '',
      city: '',
      state_id: '',
      zip_code: '',
      years_of_experience: '',
      hourly_rate: '',
      bio: '',
      languages: []
    });
  };

  const addLanguage = () => {
    setFormData(prev => ({
      ...prev,
      languages: [...prev.languages, { language_id: '', proficiency_level: 'fluent', is_primary: false }]
    }));
  };

  const removeLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const updateLanguage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => 
        i === index ? { ...lang, [field]: value } : lang
      )
    }));
  };

  const setPrimaryLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => ({
        ...lang,
        is_primary: i === index
      }))
    }));
  };

  const filteredInterpreters = interpreters.filter(interpreter =>
    interpreter.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interpreter.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interpreter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interpreter.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'approved': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: CalendarIcon },
      'rejected': { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      'suspended': { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
            Interpreters
          </h1>
          <p className="mt-2 text-gray-600">Manage interpreter profiles and information</p>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleCreate}
              variant="primary"
              className="flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Interpreter
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search interpreters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Interpreters List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInterpreters.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No interpreters found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new interpreter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInterpreters.map((interpreter) => (
              <motion.div
                key={interpreter.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {interpreter.first_name} {interpreter.last_name}
                      </h3>
                      <div className="flex items-center mt-1">
                        {getStatusBadge(interpreter.profile_status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(interpreter)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Interpreter"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(interpreter.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Interpreter"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {interpreter.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {interpreter.email}
                      </div>
                    )}
                    
                    {interpreter.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {interpreter.phone}
                      </div>
                    )}
                    
                    {interpreter.city && interpreter.state_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {interpreter.city}, {interpreter.state_name}
                      </div>
                    )}
                    
                    {interpreter.years_of_experience && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Experience:</span> {interpreter.years_of_experience} years
                      </div>
                    )}
                    
                    {interpreter.hourly_rate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Rate:</span> {formatCurrency(interpreter.hourly_rate)}/hour
                      </div>
                    )}
                    
                    {interpreter.languages && interpreter.languages.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Languages:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {interpreter.languages.map((lang, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                lang.is_primary
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {lang.language_name}
                              {lang.is_primary && (
                                <span className="ml-1 text-blue-600">★</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingInterpreter ? 'Edit Interpreter' : 'Add New Interpreter'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter first name"
                    required
                  />
                  
                  <Input
                    label="Last Name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter last name"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="interpreter@example.com"
                    required
                  />
                  
                  <Input
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <Input
                  label="Street Address"
                  value={formData.street_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                  placeholder="123 Main St"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                  
                  <Select
                    label="State"
                    value={formData.state_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, state_id: e.target.value }))}
                    options={usStates}
                    placeholder="Select state"
                  />
                  
                  <Input
                    label="ZIP Code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Years of Experience"
                    type="number"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, years_of_experience: e.target.value }))}
                    placeholder="5"
                  />
                  
                  <Input
                    label="Hourly Rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    placeholder="25.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Brief description of interpreter's background and experience..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Languages Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Languages
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addLanguage}
                      className="text-sm px-3 py-1"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Language
                    </Button>
                  </div>
                  
                  {formData.languages.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm">No languages added yet</p>
                      <p className="text-xs mt-1">Click "Add Language" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.languages.map((language, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <Select
                              value={language.language_id}
                              onChange={(e) => updateLanguage(index, 'language_id', e.target.value)}
                              options={availableLanguages.map(lang => ({
                                value: lang.id,
                                label: `${lang.name}${lang.native_name ? ` (${lang.native_name})` : ''}`
                              }))}
                              placeholder="Select language"
                              className="mb-2"
                            />
                            <Select
                              value={language.proficiency_level}
                              onChange={(e) => updateLanguage(index, 'proficiency_level', e.target.value)}
                              options={[
                                { value: 'native', label: 'Native' },
                                { value: 'fluent', label: 'Fluent' },
                                { value: 'conversational', label: 'Conversational' },
                                { value: 'basic', label: 'Basic' }
                              ]}
                              placeholder="Select proficiency"
                            />
                          </div>
                          
                          <div className="flex flex-col items-center space-y-2">
                            <button
                              type="button"
                              onClick={() => setPrimaryLanguage(index)}
                              className={`px-3 py-1 text-xs rounded-full border ${
                                language.is_primary
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {language.is_primary ? 'Primary' : 'Set Primary'}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => removeLanguage(index)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove language"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingInterpreter(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    {editingInterpreter ? 'Update' : 'Create'}
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

export default Interpreters;
