import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useJobRestrictions } from '../contexts/JobRestrictionContext';

const JobSearch = () => {
  const navigate = useNavigate();
  const { canAcceptJobs, showJobAcceptanceBlocked } = useJobRestrictions();
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mileageRequested, setMileageRequested] = useState(0);
  const [mileagePromptLoading, setMileagePromptLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    language: '',
    service_type: '',
    location: '',
    date_from: '',
    date_to: '',
    remote_only: false
  });

  useEffect(() => {
    loadJobs();
  }, [filters, currentPage]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters
      };
      
      // Add interpreter_id for matching if profile exists
      if (profile?.id) {
        params.interpreter_id = profile.id;
        console.log('Loading jobs for interpreter:', profile.id);
        console.log('Interpreter profile:', {
          languages: profile.languages,
          service_types: profile.service_types,
          service_radius_miles: profile.service_radius_miles,
          location: `${profile.city}, ${profile.state_name}`
        });
      }
      
      const response = await jobAPI.getAvailableJobs(params);
      console.log('Jobs response:', response.data);
      setJobs(response.data.data.jobs);
      setTotalPages(response.data.data.pagination.total_pages);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId, action, data = {}) => {
    try {
      let response;
      switch (action) {
        case 'accept':
          // Check if user can accept jobs (no overdue reports)
          if (!canAcceptJobs()) {
            showJobAcceptanceBlocked();
            return;
          }
          // Show mileage prompt before accepting
          setShowMileagePrompt(true);
          setSelectedJobId(jobId);
          return; // Don't proceed with acceptance yet
        case 'decline':
          response = await jobAPI.declineJob(jobId, data);
          toast.success('Job declined');
          break;
        default:
          return;
      }
      
      // Reload jobs
      loadJobs();
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${action} job`;
      toast.error(errorMessage);
    }
  };

  const handleMileageSubmit = async () => {
    if (!selectedJobId) return;
    
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(selectedJobId, { 
        mileage_requested: mileageRequested 
      });
      
      toast.success('Job accepted successfully! Your mileage request is pending admin approval.');
      setShowMileagePrompt(false);
      setSelectedJobId(null);
      setMileageRequested(0);
      
      // Reload jobs
      loadJobs();
    } catch (error) {
      console.error('Error submitting mileage request:', error);
      toast.error(`Failed to submit mileage request: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  const handleNoMileage = async () => {
    if (!selectedJobId) return;
    
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(selectedJobId, {});
      
      toast.success('Job accepted successfully!');
      setShowMileagePrompt(false);
      setSelectedJobId(null);
      setMileageRequested(0);
      
      // Reload jobs
      loadJobs();
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error(`Failed to accept job: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      language: '',
      service_type: '',
      location: '',
      date_from: '',
      date_to: '',
      remote_only: false
    });
    setCurrentPage(1);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => {
    if (typeof value === 'boolean') return value === true;
    return value !== '';
  }).length;

  // Quick filter helpers
  const setQuickFilter = (type) => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    switch (type) {
      case 'today':
        setFilters(prev => ({ ...prev, date_from: today, date_to: today }));
        break;
      case 'this_week':
        setFilters(prev => ({ ...prev, date_from: today, date_to: nextWeek }));
        break;
      case 'remote':
        setFilters(prev => ({ ...prev, remote_only: !prev.remote_only }));
        break;
      case 'clear':
        clearFilters();
        break;
      default:
        break;
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

  const calculateEarnings = (job) => {
    console.log('Calculating earnings for job:', {
      jobId: job.id,
      jobServiceTypeId: job.service_type_id,
      jobDuration: job.estimated_duration_minutes,
      profileServiceRates: profile?.service_rates
    });

    // If interpreter has custom service rates, calculate based on those
    if (profile?.service_rates && job.estimated_duration_minutes) {
      const serviceRate = profile.service_rates.find(
        rate => rate.service_type_id === job.service_type_id
      );
      
      if (serviceRate && serviceRate.rate_amount) {
        const hours = job.estimated_duration_minutes / 60;
        let earnings = 0;
        
        if (serviceRate.rate_unit === 'minutes') {
          earnings = parseFloat(serviceRate.rate_amount) * job.estimated_duration_minutes;
        } else {
          earnings = parseFloat(serviceRate.rate_amount) * hours;
        }
        
        console.log('Calculated earnings from service rate:', earnings);
        return isNaN(earnings) ? 0 : earnings;
      }
    }

    // Otherwise, use the job's total_amount (calculated by backend) if it's greater than 0
    const totalAmount = parseFloat(job.total_amount) || 0;
    if (totalAmount > 0) {
      console.log('Using job total_amount:', totalAmount);
      return totalAmount;
    }

    // Fallback: calculate from hourly rate and duration
    if (job.hourly_rate && job.estimated_duration_minutes) {
      const hours = job.estimated_duration_minutes / 60;
      const total = parseFloat(job.hourly_rate) * hours;
      console.log('Calculated from hourly rate:', total);
      return total;
    }

    console.log('No service rates or duration, returning 0');
    return 0;
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

  const getJobTypeIcon = (jobType) => {
    switch (jobType) {
      case 'medical': return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'legal': return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'business': return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'education': return <BuildingOfficeIcon className="h-4 w-4" />;
      default: return <BuildingOfficeIcon className="h-4 w-4" />;
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
          <p className="mt-2 text-gray-600">Browse available interpretation opportunities</p>
          {profile?.service_radius_miles && (
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <MapPinIcon className="h-4 w-4 mr-1" />
              Showing jobs within {profile.service_radius_miles} miles of your location
            </div>
          )}
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
        >
          {/* Quick Filters - Chips/Pills */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickFilter('today')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.date_from === new Date().toISOString().split('T')[0] && filters.date_to === new Date().toISOString().split('T')[0]
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setQuickFilter('this_week')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.date_from && filters.date_to && filters.date_to !== filters.date_from
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setQuickFilter('remote')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.remote_only
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <GlobeAltIcon className="h-4 w-4 inline mr-1" />
                Remote Only
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setQuickFilter('clear')}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  <XCircleIcon className="h-4 w-4 inline mr-1" />
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            {activeFilterCount > 0 && !showAdvancedFilters && (
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                {activeFilterCount} active
              </span>
            )}
          </button>

          {/* Advanced Filters - Collapsible */}
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
            >
              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  placeholder="e.g., Spanish"
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Service Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  placeholder="e.g., Medical"
                  value={filters.service_type}
                  onChange={(e) => handleFilterChange('service_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Los Angeles"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </motion.div>
          )}

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
            {loading ? 'Searching...' : `${jobs.length} jobs found`}
          </div>
        </motion.div>

        {/* Jobs Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or check back later for new opportunities.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/job/${job.id}`)}
                  >
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{job.job_number || job.title}</h3>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                            {job.priority} Priority
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getJobTypeIcon(job.job_type)}
                            <span className="ml-1 capitalize">{job.job_type}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Job Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{job.description}</p>

                    {/* Job Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formatDate(job.scheduled_date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {formatTime(job.scheduled_time)} ({job.estimated_duration_minutes} min)
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        {job.is_remote ? (
                          <>
                            <GlobeAltIcon className="h-4 w-4 mr-2" />
                            Remote
                          </>
                        ) : (
                          <>
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {job.location_city}, {job.location_state}
                          </>
                        )}
                      </div>
                      {!job.is_remote && job.distance_miles !== null && job.distance_miles !== undefined && (
                        <div className="flex items-center text-sm text-blue-600">
                          <ArrowPathIcon className="h-4 w-4 mr-2" />
                          <span className="font-medium">{job.distance_miles.toFixed(1)} miles away</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium">Languages:</span>
                        <span className="ml-1">{job.source_language_name || job.language_name || 'N/A'} → {job.target_language_name || 'English'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium">Service:</span>
                        <span className="ml-1">{job.service_type_name}</span>
                      </div>
                    </div>

                    {/* Rate and Earnings */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(calculateEarnings(job))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {profile?.service_rates ? 'Your earnings' : 'per hour'}
                        </div>
                        {profile?.service_rates && (
                          <div className="text-xs text-gray-400">
                            {(() => {
                              const serviceRate = profile.service_rates.find(
                                rate => rate.service_type_id === job.service_type_id
                              );
                              if (serviceRate && serviceRate.rate_amount && serviceRate.rate_unit) {
                                return `${formatCurrency(serviceRate.rate_amount)}/${serviceRate.rate_unit}`;
                              }
                              if (job.hourly_rate) {
                                return `${formatCurrency(job.hourly_rate)}/hour`;
                              }
                              return 'Rate not set';
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                      {job.status === 'finding_interpreter' && (
                        <Button
                          size="sm"
                          onClick={() => handleJobAction(job.id, 'accept')}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      )}
                      {job.status === 'assigned' && job.assigned_interpreter_id && (
                        <span className="text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded-md">
                          Job Assigned
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Mileage Prompt Modal */}
              {showMileagePrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center mb-6">
                      <CheckCircleIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Mileage Reimbursement
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Do you need to be reimbursed for mileage to this job location?
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Miles to job location:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={mileageRequested}
                          onChange={(e) => setMileageRequested(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                        {mileageRequested > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Estimated reimbursement: ${(mileageRequested * 0.7).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              <strong>Important:</strong> If you request mileage reimbursement, your assignment will need admin approval before being confirmed.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={handleNoMileage}
                          disabled={mileagePromptLoading}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          No Mileage Needed
                        </button>
                        <button
                          onClick={handleMileageSubmit}
                          disabled={mileagePromptLoading || mileageRequested <= 0}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {mileagePromptLoading ? 'Submitting...' : 'Request Mileage'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default JobSearch;
