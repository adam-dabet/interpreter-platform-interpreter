import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon,
  EyeIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  getJobStatusColor, 
  getJobStatusLabel,
  mapStatusForCustomer,
  JOB_STATUS_OPTIONS,
  canReRequestJob 
} from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Appointments = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadAppointments();
  }, [currentPage, filters]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(filters.status !== 'all' && { status: filters.status })
      });

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/customer/appointments?${params}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.data.appointments);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.message || 'Failed to load appointments');
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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


  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="mt-2 text-gray-600">Manage and track your interpreter appointments</p>
            </div>
            <button
              onClick={() => navigate('/appointments/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Appointment
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {JOB_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search appointments..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Appointments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by scheduling your first appointment.
              </p>
              <button
                onClick={() => navigate('/appointments/new')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Schedule Appointment
              </button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {pagination.total} Appointments
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {appointment.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(mapStatusForCustomer(appointment.status))}`}>
                              {getJobStatusLabel(appointment.status)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {formatDate(appointment.scheduled_date)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {formatTime(appointment.scheduled_time)} 
                            {appointment.arrival_time && (
                              <span className="ml-2 text-blue-600">
                                (Arrive: {formatTime(appointment.arrival_time)})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {appointment.is_remote ? 'Remote' : `${appointment.location_city}, ${appointment.location_state}`}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="font-medium text-gray-700">Claimant:</span>
                              <span className="ml-1 text-gray-900">
                                {appointment.claimant_first_name} {appointment.claimant_last_name}
                              </span>
                            </div>
                            {appointment.claim_number && (
                              <div>
                                <span className="font-medium text-gray-700">Claim:</span>
                                <span className="ml-1 text-gray-900">{appointment.claim_number}</span>
                              </div>
                            )}
                            {appointment.service_type_name && (
                              <div>
                                <span className="font-medium text-gray-700">Service:</span>
                                <span className="ml-1 text-gray-900">{appointment.service_type_name}</span>
                              </div>
                            )}
                            {appointment.language_name && (
                              <div>
                                <span className="font-medium text-gray-700">Language:</span>
                                <span className="ml-1 text-gray-900">{appointment.language_name}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/appointments/${appointment.id}`)}
                              className="text-blue-600 hover:text-blue-500 flex items-center"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View Details
                            </button>
                            {canReRequestJob(mapStatusForCustomer(appointment.status)) && (
                              <button
                                onClick={() => navigate(`/appointments/new?reRequest=${appointment.id}`)}
                                className="text-green-600 hover:text-green-500 flex items-center"
                              >
                                <ArrowPathIcon className="h-4 w-4 mr-1" />
                                Re-request
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {appointment.interpreter_first_name && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-blue-900">Interpreter Assigned:</span>
                              <span className="ml-2 text-blue-800">
                                {appointment.interpreter_first_name} {appointment.interpreter_last_name}
                              </span>
                              {appointment.interpreter_phone && (
                                <span className="ml-4 text-blue-700">
                                  📞 {appointment.interpreter_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm">
                      Page {currentPage} of {pagination.total_pages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                      disabled={currentPage === pagination.total_pages}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Appointments;
