import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon,
  UserIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  getJobStatusColor, 
  getJobStatusLabel,
  mapStatusForCustomer,
  canReRequestJob 
} from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { makeAuthenticatedRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAppointmentDetails();
  }, [id]);

  const loadAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments/${id}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setAppointment(data.data);
      } else {
        toast.error(data.message || 'Failed to load appointment details');
        navigate('/appointments');
      }
    } catch (error) {
      console.error('Error loading appointment details:', error);
      toast.error('Failed to load appointment details');
      navigate('/appointments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Check if appointment can be edited
  const canEditAppointment = (appointment) => {
    if (!appointment) return false;
    const nonEditableStatuses = ['completed', 'billed', 'closed', 'interpreter_paid', 'cancelled', 'no_show'];
    const canEdit = !nonEditableStatuses.includes(appointment.status);
    console.log('Can edit appointment:', canEdit, 'Status:', appointment.status);
    return canEdit;
  };

  // Helper function to format date for HTML date input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  // Helper function to calculate reserve hours from duration minutes
  const calculateReserveHours = (durationMinutes) => {
    if (!durationMinutes) return '';
    const hours = durationMinutes / 60;
    return Math.round(hours * 2) / 2; // Round to nearest 0.5 hour
  };

  // Helper function to calculate end time from start time and reserve hours
  const calculateEndTime = (startTime, reserveHours) => {
    if (!startTime || !reserveHours) return '';
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(start.getTime() + (reserveHours * 60 * 60 * 1000));
    return end.toTimeString().slice(0, 5); // Return HH:MM format
  };

  // Start editing
  const startEditing = () => {
    setEditData({
      appointmentDate: formatDateForInput(appointment.scheduled_date),
      startTime: appointment.scheduled_time || '',
      reserveHours: calculateReserveHours(appointment.estimated_duration_minutes)
    });
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  // Save changes
  const saveChanges = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!editData.appointmentDate || !editData.startTime || !editData.reserveHours) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate reserve hours
      if (editData.reserveHours <= 0) {
        toast.error('Reserve hours must be greater than 0');
        return;
      }
      
      if (editData.reserveHours > 12) {
        toast.error('Reserve hours cannot exceed 12 hours');
        return;
      }

      // Calculate end time from start time and reserve hours
      const endTime = calculateEndTime(editData.startTime, editData.reserveHours);

      // Prepare data - send date, time, and calculated end time
      const appointmentData = {
        appointmentDate: editData.appointmentDate,
        startTime: editData.startTime,
        endTime: endTime
      };
      
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(appointmentData)
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setAppointment(data.data);
        setIsEditing(false);
        setEditData({});
        toast.success('Appointment updated successfully');
      } else {
        toast.error(data.message || 'Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle reserve hours input with better validation
  const handleReserveHoursChange = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || value === '') {
      handleInputChange('reserveHours', '');
    } else {
      // Round to nearest 0.5 hour
      const roundedValue = Math.round(numValue * 2) / 2;
      handleInputChange('reserveHours', roundedValue);
    }
  };

  // Cancel appointment
  const cancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments/${id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setAppointment(data.data);
        toast.success('Appointment cancelled successfully');
      } else {
        toast.error(data.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Not Found</h2>
          <button
            onClick={() => navigate('/appointments')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Appointments
          </button>
        </div>
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
                onClick={() => navigate('/appointments')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{appointment.job_number || appointment.title}</h1>
                <p className="mt-2 text-gray-600">Appointment Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getJobStatusColor(mapStatusForCustomer(appointment.status))}`}>
                {getJobStatusLabel(appointment.status)}
              </span>
              {canEditAppointment(appointment) && !isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={startEditing}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Time
                  </button>
                  <button
                    onClick={cancelAppointment}
                    disabled={saving}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center text-sm"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    {saving ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              )}
              {canReRequestJob(mapStatusForCustomer(appointment.status)) && (
                <button
                  onClick={() => navigate(`/appointments/new?reRequest=${appointment.id}`)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Re-request Appointment
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Appointment Information
                </h2>
                {isEditing && (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Limited Editing
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>You can change the appointment date, start time, and duration. Location and other details are managed by our team.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appointment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={editData.appointmentDate || ''}
                        onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Current: {formatDate(appointment.scheduled_date)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={editData.startTime || ''}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Current: {formatTime(appointment.scheduled_time)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reserve Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={editData.reserveHours || ''}
                        onChange={(e) => handleReserveHoursChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter hours (e.g., 2.5)"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Current: {calculateReserveHours(appointment.estimated_duration_minutes)} hours
                      </p>
                      <div className="mt-1 text-xs text-gray-500">
                        Common options: 0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8 hours
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calculated End Time
                      </label>
                      <input
                        type="text"
                        value={editData.startTime && editData.reserveHours ? calculateEndTime(editData.startTime, editData.reserveHours) : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        readOnly
                        placeholder="Will be calculated automatically"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Current: {formatTime(appointment.end_time)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-sm text-gray-900">{formatDate(appointment.scheduled_date)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <p className="text-sm text-gray-900">
                      {formatTime(appointment.scheduled_time)} - {appointment.scheduled_time && appointment.estimated_duration_minutes ? formatTime(calculateEndTime(appointment.scheduled_time, calculateReserveHours(appointment.estimated_duration_minutes))) : 'N/A'}
                      {appointment.scheduled_time && appointment.estimated_duration_minutes && (
                        <span className="text-gray-500 ml-2">
                          ({calculateReserveHours(appointment.estimated_duration_minutes)} hours)
                        </span>
                      )}
                      {appointment.arrival_time && (
                        <span className="ml-2 text-blue-600">
                          (Arrive: {formatTime(appointment.arrival_time)})
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <p className="text-sm text-gray-900">
                      {appointment.estimated_duration_minutes} minutes
                      {appointment.actual_duration_minutes && (
                        <span className="ml-2 text-green-600">
                          (Actual: {appointment.actual_duration_minutes} min)
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                    <p className="text-sm text-gray-900">{appointment.appointment_type || 'Not specified'}</p>
                  </div>
                </div>
              )}

              {!isEditing && appointment.description && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900">{appointment.description}</p>
                </div>
              )}
            </motion.div>

            {/* Location Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
                Location
              </h2>
              
              {isEditing ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-800">
                        Location Not Editable
                      </h3>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Location cannot be changed. If you need to change the location, please cancel this appointment and create a new one.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {appointment.is_remote ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 font-medium">Remote Appointment</p>
                      <p className="text-blue-600 text-sm mt-1">
                        This appointment will be conducted remotely via video or phone.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {appointment.location_address && (
                        <p className="text-sm text-gray-900 mb-2">{appointment.location_address}</p>
                      )}
                      {appointment.location_city && appointment.location_state && (
                        <p className="text-sm text-gray-600">
                          {appointment.location_city}, {appointment.location_state}
                          {appointment.location_zip_code && ` ${appointment.location_zip_code}`}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Service Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Service Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <p className="text-sm text-gray-900">{appointment.service_type_name || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <p className="text-sm text-gray-900">{appointment.language_name || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interpreter Type</label>
                  <p className="text-sm text-gray-900">{appointment.interpreter_type_name || 'Not specified'}</p>
                </div>
                
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claimant Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                Claimant
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900">
                    {appointment.claimant_first_name} {appointment.claimant_last_name}
                  </p>
                </div>
                
                {appointment.claimant_phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {appointment.claimant_phone}
                    </p>
                  </div>
                )}
                
                {appointment.claimant_language && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <p className="text-sm text-gray-900">{appointment.claimant_language}</p>
                  </div>
                )}
                
                {appointment.claimant_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-sm text-gray-900">{appointment.claimant_address}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Claim Information */}
            {appointment.claim_number && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Claim Information
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
                    <p className="text-sm text-gray-900">{appointment.claim_number}</p>
                  </div>
                  
                  {appointment.case_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                      <p className="text-sm text-gray-900">{appointment.case_type}</p>
                    </div>
                  )}
                  
                  {appointment.date_of_injury && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Injury</label>
                      <p className="text-sm text-gray-900">
                        {new Date(appointment.date_of_injury).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {appointment.diagnosis && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                      <p className="text-sm text-gray-900">{appointment.diagnosis}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Interpreter Information */}
            {appointment.interpreter_first_name && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-green-600" />
                  Assigned Interpreter
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">
                      {appointment.interpreter_first_name} {appointment.interpreter_last_name}
                    </p>
                  </div>
                  
                  {appointment.interpreter_phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {appointment.interpreter_phone}
                      </p>
                    </div>
                  )}
                  
                  {appointment.interpreter_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {appointment.interpreter_email}
                      </p>
                    </div>
                  )}
                  
                  {appointment.assignment_status && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Status</label>
                      <div className="flex items-center">
                        {appointment.assignment_status === 'accepted' ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                        ) : appointment.assignment_status === 'declined' ? (
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <ClockIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">
                          {appointment.assignment_status}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {appointment.interpreter_bio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <p className="text-sm text-gray-900">{appointment.interpreter_bio}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Billing Information */}
            {appointment.billing_account_name && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Billing Information
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Account</label>
                    <p className="text-sm text-gray-900">{appointment.billing_account_name}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Invoice Section - Show only if status is 'billed' */}
            {appointment.status === 'billed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
                  Invoice
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Status</label>
                    <p className="text-sm text-gray-900">Invoice has been generated and sent</p>
                  </div>
                  
                  <div className="pt-3">
                    <button
                      onClick={async () => {
                        try {
                          // Make authenticated request to get invoice PDF
                          const invoiceUrl = `${API_BASE}/customer/appointments/${appointment.id}/invoice`;
                          const response = await makeAuthenticatedRequest(invoiceUrl);
                          
                          if (response.ok) {
                            // Create blob from response and open in new tab
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            
                            // Clean up the URL after a delay
                            setTimeout(() => {
                              window.URL.revokeObjectURL(url);
                            }, 1000);
                          } else {
                            toast.error('Failed to load invoice. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error loading invoice:', error);
                          toast.error('Failed to load invoice. Please try again.');
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      View Invoice PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;
