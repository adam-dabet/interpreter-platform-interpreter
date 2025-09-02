import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

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

const TextArea = ({ value, onChange, placeholder, className = '', label, required = false, rows = 3 }) => (
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

const ServiceLocations = ({ setCurrentView }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [mapsInitialized, setMapsInitialized] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    location_contact: '',
    city: '',
    state: '',
    zip_code: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    loadLocations();
    initializeGoogleMaps();
  }, []);

  useEffect(() => {
    if (showModal && mapsInitialized) {
      // Small delay to ensure the modal is rendered
      setTimeout(() => {
        setupAddressAutocomplete();
      }, 100);
    }
  }, [showModal, mapsInitialized]);

  const initializeGoogleMaps = () => {
    // Prevent multiple initializations
    if (mapsInitialized) {
      return;
    }

    // Check if Google Maps API key is available
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      console.log('Google Maps API key not found. Address autocomplete will be disabled.');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapsInitialized(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Script is already being loaded, wait for it
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
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
      setMapsInitialized(true);
    };
    script.onerror = () => {
      console.log('Failed to load Google Maps API. Address autocomplete will be disabled.');
    };
    document.head.appendChild(script);
  };

  const setupAddressAutocomplete = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    try {
      const addressInput = document.getElementById('location-address');
      if (addressInput) {
        const autocompleteInstance = new window.google.maps.places.Autocomplete(addressInput, {
          // Types include:
          // - 'establishment': Business names, restaurants, stores (covers most use cases)
          // Note: 'geocode' cannot be mixed with other types due to Google Maps API restrictions
          types: ['establishment'],
          componentRestrictions: { country: 'us' }
        });

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry) {
            console.log('Selected place:', place);
            
            // Extract address components
            const addressComponents = place.address_components;
            let city = '';
            let state = '';
            let zipCode = '';
            let streetNumber = '';
            let route = '';

            for (const component of addressComponents) {
              const types = component.types;
              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              } else if (types.includes('route')) {
                route = component.long_name;
              } else if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (types.includes('postal_code')) {
                zipCode = component.long_name;
              }
            }

            // Build comprehensive address
            let fullAddress = '';
            if (place.name && place.name !== place.formatted_address) {
              // This is a business/establishment
              fullAddress = `${place.name} - ${place.formatted_address}`;
              
              // Auto-fill the name field with the business name
              setFormData(prev => ({
                ...prev,
                name: place.name,
                address: fullAddress,
                city: city,
                state: state,
                zip_code: zipCode,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
              }));
              
              toast.success(`Business location added: ${place.name}`);
            } else {
              // This is a street address
              fullAddress = place.formatted_address;
              
              setFormData(prev => ({
                ...prev,
                address: fullAddress,
                city: city,
                state: state,
                zip_code: zipCode,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
              }));
              
              toast.success('Address autocompleted successfully');
            }
          }
        });

        setAutocomplete(autocompleteInstance);
      }
    } catch (error) {
      console.error('Error setting up Google Maps autocomplete:', error);
    }
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/service-locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data || []);
      } else {
        toast.error('Failed to load service locations');
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load service locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingLocation 
        ? `${API_BASE}/admin/service-locations/${editingLocation.id}`
        : `${API_BASE}/admin/service-locations`;
      
      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
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
        setEditingLocation(null);
        resetForm();
        loadLocations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/service-locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Location deleted successfully');
        loadLocations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      address: location.address || '',
      phone_number: location.phone_number || '',
      location_contact: location.location_contact || '',
      city: location.city || '',
      state: location.state || '',
      zip_code: location.zip_code || '',
      latitude: location.latitude || '',
      longitude: location.longitude || ''
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone_number: '',
      location_contact: '',
      city: '',
      state: '',
      zip_code: '',
      latitude: '',
      longitude: ''
    });
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.state?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <MapPinIcon className="h-8 w-8 mr-3 text-blue-600" />
            Service Locations
          </h1>
          <p className="mt-2 text-gray-600">Manage service locations for job assignments</p>
          
          {/* Google Maps Status */}
          <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 max-w-md">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {mapsInitialized ? (
                  '✅ Google Maps Active - Search for business names and establishments'
                ) : (
                  '⏳ Loading Google Maps...'
                )}
              </span>
            </div>
            {mapsInitialized && (
              <div className="mt-2 text-xs text-blue-700">
                💡 <strong>Tip:</strong> When adding locations, search for business names like "Walmart", "UCSF Medical Center", or "Starbucks"
              </div>
            )}
          </div>
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
              Add Location
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Locations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new service location.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit Location"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Location"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                  
                  {location.city && location.state && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <p className="text-sm text-gray-600">
                        {location.city}, {location.state} {location.zip_code}
                      </p>
                    </div>
                  )}
                  
                  {location.phone_number && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{location.phone_number}</p>
                    </div>
                  )}
                  
                                     {location.location_contact && (
                     <div className="flex items-center">
                       <UserIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                       <p className="text-sm text-gray-600">{location.location_contact}</p>
                     </div>
                   )}
                   
                   {(location.latitude && location.longitude) && (
                     <div className="flex items-center">
                       <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                       <p className="text-xs text-gray-500">
                         📍 {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                       </p>
                     </div>
                   )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h3>
              
              {/* Google Maps Status */}
              <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    {mapsInitialized ? (
                      '✅ Google Maps Ready - Search for business names and establishments'
                    ) : (
                      '⏳ Loading Google Maps... Please wait'
                    )}
                  </span>
                </div>
                {mapsInitialized && (
                  <div className="mt-2 text-xs text-blue-700">
                    💡 <strong>Examples:</strong> "Walmart", "UCSF Medical Center", "Starbucks", "CVS Pharmacy"
                  </div>
                )}
              </div>
              
                             <form onSubmit={handleSubmit} className="space-y-4">
                 <Input
                   label="Location Name"
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="e.g., Downtown Medical Center"
                   required
                 />
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Address <span className="text-red-500">*</span>
                   </label>
                   <input
                     id="location-address"
                     type="text"
                     value={formData.address}
                     onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                     placeholder="Search for business names like 'Walmart' or 'UCSF Medical Center'..."
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     required
                   />
                   {mapsInitialized ? (
                     <p className="text-xs text-green-600 mt-1">
                       ✅ Google Maps Active - Search for business names like "Walmart", "UCSF Medical Center", "Starbucks"
                     </p>
                   ) : (
                     <p className="text-xs text-orange-600 mt-1">
                       ⚠️ Google Maps Loading - You can still type addresses manually
                     </p>
                   )}
                 </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                  <Input
                    label="State"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>
                
                <Input
                  label="ZIP Code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="ZIP Code"
                />
                
                <Input
                  label="Phone Number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
                
                                 <Input
                   label="Location Contact"
                   value={formData.location_contact}
                   onChange={(e) => setFormData(prev => ({ ...prev, location_contact: e.target.value }))}
                   placeholder="Contact person name"
                 />
                 
                 {/* Location Type and Coordinates Display */}
                 {(formData.latitude && formData.longitude) && (
                   <div className="bg-green-50 border border-green-200 rounded-md p-3">
                     <p className="text-sm text-green-800 mb-2">
                       <span className="font-medium">📍 Coordinates:</span> {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                     </p>
                     {formData.name && formData.name !== formData.address && (
                       <p className="text-sm text-green-800">
                         <span className="font-medium">🏢 Type:</span> Business/Establishment
                       </p>
                     )}
                   </div>
                 )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingLocation(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    {editingLocation ? 'Update' : 'Create'}
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

export default ServiceLocations;
