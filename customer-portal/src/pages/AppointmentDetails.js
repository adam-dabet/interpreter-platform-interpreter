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
  ArrowPathIcon
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
                <h1 className="text-3xl font-bold text-gray-900">{appointment.title}</h1>
                <p className="mt-2 text-gray-600">Appointment Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getJobStatusColor(mapStatusForCustomer(appointment.status))}`}>
                {getJobStatusLabel(appointment.status)}
              </span>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                Appointment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-sm text-gray-900">{formatDate(appointment.scheduled_date)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <p className="text-sm text-gray-900">
                    {formatTime(appointment.scheduled_time)}
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

              {appointment.description && (
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;
