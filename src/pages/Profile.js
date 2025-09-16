import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  AcademicCapIcon,
  LanguageIcon,
  DocumentTextIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, profile, token, isLoading, updateProfile, loadProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper function to get rate for a service type
  const getServiceRate = (serviceTypeId) => {
    if (!profile?.service_rates || !Array.isArray(profile.service_rates)) {
      return null;
    }
    
    const rate = profile.service_rates.find(rate => rate.service_type_id === serviceTypeId);
    return rate;
  };
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    street_address: '',
    street_address_2: '',
    city: '',
    zip_code: '',
    latitude: '',
    longitude: '',
    service_radius_miles: 25, // Default 25 miles
    bio: '',
    availability_notes: ''
  });

  useEffect(() => {
    console.log('Profile useEffect triggered, profile:', profile);
    console.log('Profile data structure:', {
      hasProfile: !!profile,
      profileKeys: profile ? Object.keys(profile) : [],
      languages: profile?.languages,
      serviceTypes: profile?.service_types,
      serviceRates: profile?.service_rates,
      certificates: profile?.certificates
    });
    
    if (profile) {
      console.log('Setting form data with profile:', profile);
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        street_address: profile.street_address || '',
        street_address_2: profile.street_address_2 || '',
        city: profile.city || '',
        zip_code: profile.zip_code || '',
        latitude: profile.latitude || '',
        longitude: profile.longitude || '',
        service_radius_miles: profile.service_radius_miles || 25,
        bio: profile.bio || '',
        availability_notes: profile.availability_notes || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      street_address: profile.street_address || '',
      street_address_2: profile.street_address_2 || '',
      city: profile.city || '',
      zip_code: profile.zip_code || '',
      latitude: profile.latitude || '',
      longitude: profile.longitude || '',
      service_radius_miles: profile.service_radius_miles || 25,
      bio: profile.bio || '',
      availability_notes: profile.availability_notes || ''
    });
    setIsEditing(false);
  };

  const radiusOptions = [
    { value: '10', label: '10 miles' },
    { value: '15', label: '15 miles' },
    { value: '25', label: '25 miles' },
    { value: '50', label: '50 miles' },
    { value: '75', label: '75 miles' },
    { value: '100', label: '100 miles' }
  ];



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your interpreter profile and information</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Profile Overview</h2>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Personal Information
              </h3>
              
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <Input
                      label="First Name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                    />
                    <Input
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />

                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {user?.email}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {profile?.phone || 'Not provided'}
                      </p>
                    </div>
                    

                  </>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Address & Service Area
              </h3>
              
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <Input
                      label="Street Address"
                      value={formData.street_address}
                      onChange={(e) => handleInputChange('street_address', e.target.value)}
                    />
                    <Input
                      label="Street Address 2"
                      value={formData.street_address_2}
                      onChange={(e) => handleInputChange('street_address_2', e.target.value)}
                    />
                    <Input
                      label="City"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile?.state_name || 'Not provided'}
                      </p>
                    </div>
                    <Input
                      label="ZIP Code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange('zip_code', e.target.value)}
                    />
                    <Select
                      label="Service Radius"
                      value={formData.service_radius_miles.toString()}
                      onChange={(e) => handleInputChange('service_radius_miles', parseInt(e.target.value))}
                      options={radiusOptions}
                      placeholder="Select service radius"
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile?.street_address || 'Not provided'}
                        {profile?.street_address_2 && (
                          <>
                            <br />
                            {profile.street_address_2}
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City, State, ZIP</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile?.city || 'Not provided'}, {profile?.state_name || 'Not provided'} {profile?.zip_code || ''}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Radius</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {profile?.service_radius_miles || 25} miles
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio and Availability */}
          {isEditing ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about your experience and expertise..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability Notes</label>
                <textarea
                  value={formData.availability_notes}
                  onChange={(e) => handleInputChange('availability_notes', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific availability preferences or notes..."
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {profile?.bio && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.bio}</p>
                </div>
              )}
              {profile?.availability_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.availability_notes}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Languages & Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <LanguageIcon className="h-5 w-5 mr-2" />
            Languages & Services
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Languages */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Languages</h3>
              <div className="space-y-2">
                {profile?.languages && Array.isArray(profile.languages) && profile.languages.length > 0 ? (
                  profile.languages.map((lang, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-900">
                        {lang.name || lang.native_name || 'Unknown Language'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {lang.proficiency_level || 'Not specified'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No languages added yet</p>
                )}
              </div>
            </div>

            {/* Service Types */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Service Types</h3>
              <div className="space-y-2">
                {profile?.service_types && Array.isArray(profile.service_types) && profile.service_types.length > 0 ? (
                  profile.service_types.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-900">
                        {service.name || 'Unknown Service'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {service.code || 'No description available'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No service types added yet</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Service Rates */}
        {profile?.service_rates && Array.isArray(profile.service_rates) && profile.service_rates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-lg shadow-sm border p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Service Rates
            </h2>

            <div className="space-y-3">
              {profile.service_rates.map((rate, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {rate.service_type_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {rate.service_type_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      ${rate.rate_amount}/hour
                    </span>
                    {rate.custom_minimum_hours && (
                      <p className="text-xs text-gray-500">
                        Min: {rate.custom_minimum_hours} hours
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Certifications & Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Certifications & Documents
          </h2>

          <div className="space-y-4">
            {profile?.certificates && Array.isArray(profile.certificates) && profile.certificates.length > 0 ? (
              profile.certificates.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {cert.certificate_type_name || 'Unknown Certificate'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Issued: {cert.issue_date || 'Not specified'} | Expires: {cert.expiry_date || 'Not specified'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    cert.verification_status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {cert.verification_status || 'pending'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No certifications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add your professional certifications and documents.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Debug Section - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border p-6 mt-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Debug Information</h2>
            <div className="bg-gray-100 p-4 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Authentication State:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Manual profile refresh clicked');
                    loadProfile();
                  }}
                >
                  Refresh Profile
                </Button>
              </div>
              <pre className="text-xs text-gray-600">
                {JSON.stringify({
                  hasUser: !!user,
                  hasToken: !!token,
                  hasProfile: !!profile,
                  isLoading,
                  userEmail: user?.email
                }, null, 2)}
              </pre>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Service Rates Data:</h3>
                <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                  {JSON.stringify(profile?.service_rates, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Raw Profile Data:</h3>
                <pre className="text-xs text-gray-600 overflow-auto max-h-96">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
