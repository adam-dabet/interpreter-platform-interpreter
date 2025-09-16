import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { 
  getJobStatusColor, 
  JOB_STATUS_OPTIONS 
} from '../utils/statusConstants';

const JobManagement = ({ setCurrentView }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_jobs: 0,
    open_jobs: 0,
    assigned_jobs: 0,
    in_progress_jobs: 0,
    completed_jobs: 0,
    cancelled_jobs: 0,
    total_revenue: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    needsInterpreter: false,
    needsConfirmation: false,
    needsInterpreterConfirmation: false,
    needsBilling: false,
    needsPayment: false,
    isRemote: 'all',
    priority: 'all',
    search: ''
  });

  useEffect(() => {
    loadJobs();
    loadStats();
  }, [currentPage, filters]);


  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      // Add filters to query parameters
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.dateRange !== 'all') {
        params.append('dateRange', filters.dateRange);
      }
      if (filters.needsInterpreter) {
        params.append('needsInterpreter', 'true');
      }
      if (filters.needsConfirmation) {
        params.append('needsConfirmation', 'true');
      }
      if (filters.needsInterpreterConfirmation) {
        params.append('needsInterpreterConfirmation', 'true');
      }
      if (filters.needsBilling) {
        params.append('needsBilling', 'true');
      }
      if (filters.needsPayment) {
        params.append('needsPayment', 'true');
      }
      if (filters.isRemote !== 'all') {
        params.append('isRemote', filters.isRemote);
      }
      if (filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      
      const response = await fetch(`http://localhost:3001/api/admin/jobs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.data || []);
        // Since we don't have pagination yet, set totalPages to 1
        setTotalPages(1);
      } else {
        console.error('Failed to load jobs:', response.status);
        setJobs([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3001/api/admin/jobs/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || {
          total_jobs: 0,
          open_jobs: 0,
          assigned_jobs: 0,
          in_progress_jobs: 0,
          completed_jobs: 0,
          cancelled_jobs: 0,
          total_revenue: 0
        });
      } else {
        console.error('Failed to load stats:', response.status);
        // Keep default stats on error
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`http://localhost:3001/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Reload jobs and stats
        loadJobs();
        loadStats();
        // You could add a toast notification here if you have a toast library
        alert('Job deleted successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job');
    }
  };

  const handleApproveJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to approve this appointment? It will be made available to interpreters.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`http://localhost:3001/api/admin/jobs/${jobId}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Reload jobs and stats
        loadJobs();
        loadStats();
        alert('Appointment approved successfully and sent to interpreters');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      alert('Failed to approve appointment');
    }
  };

  const handleRejectJob = async (jobId) => {
    const reason = window.prompt('Please provide a reason for rejecting this appointment:');
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`http://localhost:3001/api/admin/jobs/${jobId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason || 'No reason provided'
        })
      });
      
      if (response.ok) {
        // Reload jobs and stats
        loadJobs();
        loadStats();
        alert('Appointment rejected successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      alert('Failed to reject appointment');
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


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter helper functions
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: 'all',
      dateRange: 'all',
      needsInterpreter: false,
      needsConfirmation: false,
      needsInterpreterConfirmation: false,
      needsBilling: false,
      needsPayment: false,
      isRemote: 'all',
      priority: 'all',
      search: ''
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.needsInterpreter) count++;
    if (filters.needsConfirmation) count++;
    if (filters.needsInterpreterConfirmation) count++;
    if (filters.needsBilling) count++;
    if (filters.needsPayment) count++;
    if (filters.isRemote !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.search) count++;
    return count;
  };


  const statusFilters = JOB_STATUS_OPTIONS;

  const dateRangeFilters = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this_week', label: 'This Week' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'past', label: 'Past Appointments' },
    { value: 'upcoming', label: 'Upcoming Appointments' }
  ];

  const priorityFilters = [
    { value: 'all', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' }
  ];

  const remoteFilters = [
    { value: 'all', label: 'All Types' },
    { value: 'true', label: 'Remote Only' },
    { value: 'false', label: 'In-Person Only' }
  ];

  if (loading && (jobs || []).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Job Management</h1>
        <p className="mt-2 text-gray-600">Manage interpretation job assignments</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_jobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open_jobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed_jobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setCurrentView('create-job')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Job
          </button>
          
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Clear Filters */}
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* All Filters - Always Visible */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusFilters.map((filterOption) => (
                <option key={filterOption.value} value={filterOption.value}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateRangeFilters.map((filterOption) => (
                <option key={filterOption.value} value={filterOption.value}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorityFilters.map((filterOption) => (
                <option key={filterOption.value} value={filterOption.value}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Remote/In-Person Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Type
            </label>
            <select
              value={filters.isRemote}
              onChange={(e) => handleFilterChange('isRemote', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {remoteFilters.map((filterOption) => (
                <option key={filterOption.value} value={filterOption.value}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Action Filters */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quick Filters
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Needs Interpreter */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsInterpreter}
                onChange={(e) => handleFilterChange('needsInterpreter', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm text-gray-700">Finding Interpreter</span>
              </div>
            </label>

            {/* Needs Confirmation */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsConfirmation}
                onChange={(e) => handleFilterChange('needsConfirmation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm text-gray-700">Needs Facility Confirmation</span>
              </div>
            </label>

            {/* Needs Interpreter Confirmation */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsInterpreterConfirmation}
                onChange={(e) => handleFilterChange('needsInterpreterConfirmation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm text-gray-700">Needs Interpreter Confirmation</span>
              </div>
            </label>

            {/* Needs Billing */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsBilling}
                onChange={(e) => handleFilterChange('needsBilling', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-gray-700">Completed - Needs Billing</span>
              </div>
            </label>

            {/* Needs Payment */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsPayment}
                onChange={(e) => handleFilterChange('needsPayment', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center">
                <CheckBadgeIcon className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm text-gray-700">Report Submitted - Needs Payment</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Jobs</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (jobs || []).length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new job assignment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Interpreter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(jobs || []).map((job) => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => setCurrentView('job-details', { jobId: job.id })}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{job.job_number || job.title}</div>
                        <div className="text-sm text-gray-500">{job.client_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(job.scheduled_date)}</div>
                      <div className="text-sm text-gray-500">{formatTime(job.scheduled_time)}</div>
                      {job.arrival_time && (
                        <div className="text-xs text-blue-600">
                          Arrive: {formatTime(job.arrival_time)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {job.is_remote ? 'Remote' : 'In Person'} • {job.estimated_duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{job.service_type_name}</div>
                      <div className="text-sm text-gray-500">
                        {job.source_language_name} → {job.target_language_name || 'English'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatCurrency(job.hourly_rate)}/hr
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.requested_by_name || 'Not specified'}
                      </div>
                      {job.billing_account_name && (
                        <div className="text-xs text-green-600">
                          Billing: {job.billing_account_name}
                        </div>
                      )}
                      {job.claimant_first_name && job.claimant_last_name && (
                        <div className="text-xs text-gray-500">
                          Claimant: {job.claimant_first_name} {job.claimant_last_name}
                        </div>
                      )}
                      {job.claim_number && (
                        <div className="text-xs text-gray-400">
                          Claim: {job.claim_number}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.assigned_interpreter_name || (
                          <span className="text-gray-400 italic">Not assigned</span>
                        )}
                      </div>
                      {job.assigned_interpreter_name && (
                        <>
                          <div className="text-xs text-blue-600">
                            {job.assigned_interpreter_email}
                          </div>
                          {job.assigned_interpreter_phone && (
                            <div className="text-xs text-gray-500">
                              {job.assigned_interpreter_phone}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            ID: {job.assigned_interpreter_id}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.is_remote ? 'Remote' : job.location_address}
                      </div>
                      {!job.is_remote && job.location_city && job.location_state && (
                        <div className="text-xs text-gray-500">
                          {job.location_city}, {job.location_state}
                          {job.location_zip_code && ` ${job.location_zip_code}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium text-gray-900">
                          {job.created_by_username || 'Unknown'}
                        </span>
                        {job.created_by_email && (
                          <span className="text-xs text-gray-500">
                            {job.created_by_email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        {job.status === 'pending_authorization' ? (
                          <>
                            <button 
                              onClick={() => handleApproveJob(job.id)}
                              className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 text-xs"
                              title="Approve and Send to Interpreters"
                            >
                              <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectJob(job.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 text-xs"
                              title="Reject Appointment"
                            >
                              <XCircleIcon className="h-4 w-4 inline mr-1" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => setCurrentView('job-details', { jobId: job.id })}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setCurrentView('edit-job', { jobId: job.id })}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit Job"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteJob(job.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Job"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
