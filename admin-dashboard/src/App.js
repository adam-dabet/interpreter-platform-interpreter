import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobManagement from './pages/JobManagement';
import CreateJob from './pages/CreateJob';
import JobDetails from './pages/JobDetails';
import EditJob from './pages/EditJob';
import ServiceLocations from './pages/ServiceLocations';
import BillingAccounts from './pages/BillingAccounts';
import Customers from './pages/Customers';
import Claimants from './pages/Claimants';
import Interpreters from './pages/Interpreters';
import Sidebar from './components/Sidebar';

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

const Input = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

const Select = ({ value, onChange, options, placeholder, className = '' }) => (
  <select
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  >
    <option value="">{placeholder}</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    limit: '10'
  });
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [currentView, setCurrentView] = useState('applications'); // 'applications', 'jobs', 'create-job', 'job-details', or 'edit-job'
  const [viewParams, setViewParams] = useState({}); // For passing parameters like jobId

  useEffect(() => {
    checkAuth();
  }, []);

  const handleViewChange = (view, params = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  };

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }

    return response.json();
  };

  const login = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('adminToken', result.data.token);
        setIsAuthenticated(true);
        loadDashboardData();
        toast.success('Login successful');
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setStats(null);
    setApplications([]);
    setPagination({});
    setCurrentPage(1);
    setFilters({ status: '', search: '', limit: '10' });
    setSelectedApplication(null);
    setShowModal(false);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadApplications(1)
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/admin/dashboard/stats');
      if (result && result.success) {
        setStats(result.data.overview);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadApplications = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: filters.limit
      });
      
      if (filters.status) params.append('status', filters.status);
      if (filters.search.trim()) params.append('search', filters.search.trim());
      
      const result = await apiCall(`/admin/profiles?${params.toString()}`);
      
      if (result && result.success) {
        setApplications(result.data.applications);
        setPagination(result.data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadApplications(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', search: '', limit: '10' });
    setCurrentPage(1);
    loadApplications(1);
  };

  const viewApplication = async (id) => {
    try {
      const result = await apiCall(`/admin/profiles/${id}`);
      if (result && result.success) {
        setSelectedApplication(result.data);
        setShowModal(true);
      }
    } catch (error) {
      toast.error('Failed to load application details');
    }
  };

  const updateApplicationStatus = async (id, status, notes = '') => {
    try {
      const result = await apiCall(`/admin/profiles/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes })
      });

      if (result && result.success) {
        toast.success(`Application ${status.replace('_', ' ')} successfully`);
        loadApplications(currentPage);
        loadStats();
      }
    } catch (error) {
      toast.error('Failed to update application status');
    }
  };

  const approveApplication = async (id) => {
    try {
      const result = await apiCall(`/admin/profiles/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Approved by admin' })
      });

      if (result && result.success) {
        toast.success('Application approved successfully');
        loadApplications(currentPage);
        loadStats();
      }
    } catch (error) {
      toast.error('Failed to approve application');
    }
  };

  const rejectApplication = async (id) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      const result = await apiCall(`/admin/profiles/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ 
          rejection_reason: reason,
          notes: 'Rejected by admin'
        })
      });

      if (result && result.success) {
        toast.success('Application rejected successfully');
        loadApplications(currentPage);
        loadStats();
      }
    } catch (error) {
      toast.error('Failed to reject application');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
        >
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          <form onSubmit={login} className="space-y-4">
            <div>
              <Input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <Sidebar 
          currentView={currentView} 
          setCurrentView={handleViewChange} 
          onLogout={logout}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">

          {/* Stats Cards - Only show for applications view */}
          {currentView === 'applications' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending_profiles}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.under_review}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.this_week_submissions}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters - Only show for applications view */}
        {currentView === 'applications' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by name or email..."
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'under_review', label: 'Under Review' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  placeholder="All Statuses"
                />
              </div>
              <div className="w-full md:w-32">
                <Select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', e.target.value)}
                  options={[
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' }
                  ]}
                  placeholder="Limit"
                />
              </div>
              <Button onClick={handleSearch} className="w-full md:w-auto">
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={clearFilters} variant="secondary" className="w-full md:w-auto">
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Content based on current view */}
        {currentView === 'applications' && (
          <>
            {/* Applications Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Applications</h2>
          </div>
          
          {applications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No applications found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Languages & Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => viewApplication(application.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                          {application.application_status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveApplication(application.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                                title="Approve Application"
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => rejectApplication(application.id)}
                                className="text-red-600 hover:text-red-900 flex items-center"
                                title="Reject Application"
                              >
                                <XCircleIcon className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.applicant_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.years_experience || 0} years experience
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{application.email}</div>
                          <div className="text-sm text-gray-500">{application.phone}</div>
                          <div className="text-sm text-gray-500">{application.state}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">Languages:</span> {application.languages}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Services:</span> {application.service_types}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-2 ${
                            application.application_status === 'approved' ? 'bg-green-100 text-green-800' :
                            application.application_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            application.application_status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {application.application_status.replace('_', ' ')}
                          </span>
                          <div className="text-sm text-gray-500">
                            {new Date(application.submission_date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_count > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of{' '}
                  {pagination.total_count} results
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => loadApplications(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="secondary"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => loadApplications(currentPage + 1)}
                    disabled={!pagination.has_more}
                    variant="secondary"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {currentView === 'jobs' && (
          <JobManagement setCurrentView={handleViewChange} />
        )}

        {currentView === 'interpreters' && (
          <Interpreters setCurrentView={handleViewChange} />
        )}

        {currentView === 'create-job' && (
          <CreateJob setCurrentView={handleViewChange} />
        )}

        {currentView === 'job-details' && (
          <JobDetails jobId={viewParams.jobId} setCurrentView={handleViewChange} />
        )}

        {currentView === 'edit-job' && (
          <EditJob jobId={viewParams.jobId} setCurrentView={handleViewChange} />
        )}

        {currentView === 'service-locations' && (
          <ServiceLocations setCurrentView={handleViewChange} />
        )}

        {currentView === 'billing-accounts' && (
          <BillingAccounts setCurrentView={handleViewChange} />
        )}

        {currentView === 'customers' && (
          <Customers setCurrentView={handleViewChange} />
        )}

        {currentView === 'claimants' && (
          <Claimants setCurrentView={handleViewChange} />
        )}
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Application Details - {selectedApplication.first_name} {selectedApplication.last_name}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-sm font-medium">{selectedApplication.first_name} {selectedApplication.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-sm font-medium">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Years of Experience</p>
                    <p className="text-sm font-medium">{selectedApplication.years_experience !== null && selectedApplication.years_experience !== undefined ? selectedApplication.years_experience : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {selectedApplication.street_address && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Address Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Street Address</p>
                      <p className="text-sm font-medium">{selectedApplication.street_address}</p>
                      {selectedApplication.street_address_2 && (
                        <p className="text-sm font-medium">{selectedApplication.street_address_2}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City, State, ZIP</p>
                      <p className="text-sm font-medium">
                        {selectedApplication.city}, {selectedApplication.state_name || selectedApplication.state} {selectedApplication.zip_code}
                      </p>
                    </div>
                    {selectedApplication.formatted_address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Formatted Address</p>
                        <p className="text-sm font-medium">{selectedApplication.formatted_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Professional Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Professional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Languages</p>
                    <p className="text-sm font-medium">{selectedApplication.languages}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Types</p>
                    <p className="text-sm font-medium">{selectedApplication.service_types}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Application Status</p>
                    <p className="text-sm font-medium">{selectedApplication.application_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submission Date</p>
                    <p className="text-sm font-medium">{new Date(selectedApplication.submission_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Service Rates */}
              {selectedApplication.service_rates && selectedApplication.service_rates.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Service Rates</h4>
                  <div className="space-y-3">
                    {selectedApplication.service_rates.map((rate, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{rate.service_type_name}</p>
                            <p className="text-sm text-gray-600">
                              {rate.rate_type === 'custom' ? 'Custom' : 'Platform'} Rate: 
                              ${rate.rate_type === 'platform' ? 
                                rate.platform_rate_amount : 
                                rate.rate_amount}/{rate.rate_type === 'platform' ? 
                                rate.platform_rate_unit : 
                                rate.rate_unit}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            rate.rate_type === 'custom' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {rate.rate_type}
                          </span>
                        </div>
                        {rate.custom_minimum_hours && (
                          <p className="text-sm text-gray-500 mt-1">
                            Minimum Hours: {rate.custom_minimum_hours}
                          </p>
                        )}
                        {rate.custom_interval_minutes && (
                          <p className="text-sm text-gray-500">
                            Interval: {rate.custom_interval_minutes} minutes
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedApplication.certificates && selectedApplication.certificates.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Certifications</h4>
                  <div className="space-y-3">
                    {selectedApplication.certificates.map((cert, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                                                 <div className="flex justify-between items-start">
                           <div>
                             <p className="text-sm font-medium">{cert.certificate_type_name}</p>
                             {cert.certificate_number && (
                               <p className="text-sm text-gray-600">
                                 Certificate #: {cert.certificate_number}
                               </p>
                             )}
                             {cert.issuing_organization && (
                               <p className="text-sm text-gray-600">
                                 Issuing Org: {cert.issuing_organization}
                               </p>
                             )}
                             {cert.issue_date && (
                               <p className="text-sm text-gray-600">
                                 Issued: {new Date(cert.issue_date).toLocaleDateString()}
                               </p>
                             )}
                             {cert.expiry_date && (
                               <p className="text-sm text-gray-600">
                                 Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                               </p>
                             )}
                           </div>
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                            {cert.verification_status || 'Pending'}
                          </span>
                        </div>
                                                 {cert.file_path ? (
                           <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                             <p className="text-sm font-medium text-blue-900 mb-2">
                               📎 Certificate Document Uploaded
                             </p>
                             <div className="flex items-center space-x-3">
                               <a
                                 href={`http://localhost:3001${cert.file_path}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                               >
                                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                 </svg>
                                 View Certificate
                               </a>
                               <span className="text-sm text-gray-600">
                                 {cert.file_name || 'Certificate Document'} 
                                 {cert.file_size && ` (${Math.round(cert.file_size / 1024)} KB)`}
                               </span>
                             </div>
                           </div>
                         ) : (
                           <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                             <p className="text-sm text-yellow-800">
                               ⚠️ Certificate information provided (no file uploaded)
                             </p>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* W9 Forms */}
              {selectedApplication.w9_forms && selectedApplication.w9_forms.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">W9 Tax Information</h4>
                  <div className="space-y-3">
                    {selectedApplication.w9_forms.map((w9, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        {w9.entry_method === 'upload' && w9.file_path ? (
                          // File upload only - show just the file, no form data
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <a
                                  href={`http://localhost:3001${w9.file_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View W9 Form
                                </a>
                                <span className="text-sm text-gray-600">
                                  {w9.file_name || 'W9 Document'} 
                                  {w9.file_size && ` (${Math.round(w9.file_size / 1024)} KB)`}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              {w9.verification_status || 'Pending'}
                            </span>
                          </div>
                        ) : (
                          // Manual entry - show business information
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{w9.business_name}</p>
                              <p className="text-sm text-gray-600">
                                Business Type: {w9.business_type}
                              </p>
                              <p className="text-sm text-gray-600">
                                Tax Classification: {w9.tax_classification}
                              </p>
                              {w9.ein && (
                                <p className="text-sm text-gray-600">
                                  EIN: {w9.ein}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                Address: {w9.address}, {w9.city}, {w9.state} {w9.zip_code}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              {w9.verification_status || 'Pending'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApplication.bio && (
                    <div>
                      <p className="text-sm text-gray-600">Bio</p>
                      <p className="text-sm font-medium">{selectedApplication.bio}</p>
                    </div>
                  )}
                  {selectedApplication.availability_notes && (
                    <div>
                      <p className="text-sm text-gray-600">Availability Notes</p>
                      <p className="text-sm font-medium">{selectedApplication.availability_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button onClick={() => setShowModal(false)} variant="secondary">
                Close
              </Button>
              {selectedApplication.application_status === 'pending' && (
                <>
                  <Button onClick={() => approveApplication(selectedApplication.id)} variant="success">
                    Approve
                  </Button>
                  <Button onClick={() => rejectApplication(selectedApplication.id)} variant="danger">
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function App() {
  return <AdminDashboard />;
}

export default App;
