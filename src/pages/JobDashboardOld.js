import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  FunnelIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate as formatDateUtil, formatTime as formatTimeUtil, formatCurrency as formatCurrencyUtil } from '../utils/dateUtils';
import InterpreterCompletionReport from '../components/InterpreterCompletionReport';
import { 
  getJobStatusColor, 
  getAssignmentStatusColor,
  getJobStatusLabel,
  getAssignmentStatusLabel
} from '../utils/statusConstants';

const JobDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCompletionReport, setShowCompletionReport] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mileageRequested, setMileageRequested] = useState(0);
  const [mileageRate, setMileageRate] = useState(0.70);
  const [mileagePromptLoading, setMileagePromptLoading] = useState(false);
  const FEDERAL_MILEAGE_CAP = 0.72;
  const [earningsPeriod, setEarningsPeriod] = useState('week');
  const [earningsLoading, setEarningsLoading] = useState(false);

  useEffect(() => {
    // Reset to page 1 when switching tabs
    setCurrentPage(1);
    loadJobs();
    if (activeTab === 'earnings') {
      loadEarnings(earningsPeriod);
    } else {
      loadEarnings();
    }
  }, [activeTab, filter, earningsPeriod]);

  useEffect(() => {
    // Load jobs when page changes (for pagination)
    if (activeTab === 'past' || (activeTab !== 'upcoming' && activeTab !== 'completion_reports')) {
      loadJobs();
    }
  }, [currentPage]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // For upcoming and completion_reports, load all jobs without pagination
      // For past jobs and other tabs, use pagination
      const params = (activeTab === 'upcoming' || activeTab === 'completion_reports')
        ? { limit: 500 } // Load all jobs for upcoming and completion_reports tabs
        : {
            page: currentPage,
            limit: 20, // Increased limit for past jobs
            ...(filter !== 'all' && { status: filter })
          };
      
      const response = await jobAPI.getMyJobs(params);
      console.log('Loaded jobs:', response.data.data.jobs);
      setJobs(response.data.data.jobs);
      setTotalPages(response.data.data.pagination.total_pages);
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async (period = 'all') => {
    try {
      setEarningsLoading(true);
      const response = await jobAPI.getEarnings({ period });
      setEarnings(response.data.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleJobAction = async (jobId, action, data = {}) => {
    try {
      let response;
      switch (action) {
        case 'accept':
          // Show mileage prompt before accepting
          setShowMileagePrompt(true);
          setSelectedJobId(jobId);
          return; // Don't proceed with acceptance yet
        case 'decline':
          response = await jobAPI.declineJob(jobId, data);
          toast.success('Job declined');
          break;
        case 'unassign':
          response = await jobAPI.unassignJob(jobId, data);
          toast.success('Successfully unassigned from job');
          break;
        case 'start':
          response = await jobAPI.startJob(jobId);
          toast.success('Job started successfully!');
          break;
        case 'end':
          response = await jobAPI.endJob(jobId);
          toast.success('Job ended successfully!');
          break;

        default:
          return;
      }
      
      // Reload jobs and earnings
      loadJobs();
      loadEarnings();
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
      const effectiveRate = Math.min(FEDERAL_MILEAGE_CAP, Math.max(0, parseFloat(mileageRate) || 0.70));
      const response = await jobAPI.acceptJob(selectedJobId, { 
        mileage_requested: mileageRequested,
        mileage_rate: effectiveRate
      });
      
      toast.success('Job accepted successfully! Your mileage request is pending admin approval.');
      setShowMileagePrompt(false);
      setSelectedJobId(null);
      setMileageRequested(0);
      setMileageRate(0.70);
      
      // Reload jobs and earnings
      loadJobs();
      loadEarnings();
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
      setMileageRate(0.70);
      
      // Reload jobs and earnings
      loadJobs();
      loadEarnings();
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error(`Failed to accept job: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return <CheckCircleIcon className="h-4 w-4" />;
      case 'in_progress': return <PlayIcon className="h-4 w-4" />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />;
      case 'completion_report': return <DocumentTextIcon className="h-4 w-4" />;
      case 'billed': return <CurrencyDollarIcon className="h-4 w-4" />;
      case 'closed': return <CheckBadgeIcon className="h-4 w-4" />;
      case 'interpreter_paid': return <CurrencyDollarIcon className="h-4 w-4" />;
      case 'finding_interpreter': return <MagnifyingGlassIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Use imported date utilities
  const formatDate = (dateString) => {
    return formatDateUtil(dateString, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return formatTimeUtil(timeString);
  };

  const formatCurrency = (amount) => {
    return formatCurrencyUtil(amount);
  };

  const calculateJobEarnings = (job) => {
    if (!job.estimated_duration_minutes) {
      return job.agreed_rate || job.hourly_rate || 0;
    }

    const hours = job.estimated_duration_minutes / 60;
    const hourlyRate = job.agreed_rate || job.hourly_rate || 0;
    
    return hourlyRate * hours;
  };

  // Check if job is more than 24 hours away
  const isJobMoreThan24HoursAway = (job) => {
    try {
      // Check if we have the required date/time fields
      if (!job.scheduled_date || !job.scheduled_time) {
        return false;
      }

      const now = new Date();
      
      // Handle different date formats
      let jobDateTime;
      if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes('T')) {
        // Already a full datetime string
        jobDateTime = new Date(job.scheduled_date);
      } else {
        // Combine date and time
        const dateStr = job.scheduled_date.toString();
        const timeStr = job.scheduled_time.toString();
        jobDateTime = new Date(`${dateStr}T${timeStr}`);
      }

      // Check if the date is valid
      if (isNaN(jobDateTime.getTime())) {
        return false;
      }

      const hoursUntilJob = (jobDateTime - now) / (1000 * 60 * 60);
      
      return hoursUntilJob > 24;
    } catch (error) {
      console.error('Error checking job timing:', error, {
        jobId: job.id,
        status: job.status,
        scheduled_date: job.scheduled_date,
        scheduled_time: job.scheduled_time
      });
      return false;
    }
  };

  // Filter jobs based on active tab
  const getFilteredJobs = () => {
    
    if (activeTab === 'upcoming') {
      const upcomingJobs = jobs.filter(job => {
        // Show jobs that are finding_interpreter (available to accept) or assigned/in_progress
        const isAvailable = job.status === 'finding_interpreter';
        const isAssigned = job.status === 'assigned' || job.status === 'in_progress';
        const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
        
        const shouldShow = (isAvailable || isAssigned) && isNotCompleted;
        
        return shouldShow;
      });
      return upcomingJobs;
    } else if (activeTab === 'completion_reports') {
      const completionReportJobs = jobs.filter(job => {
        // Show jobs that need completion reports (completed but not submitted)
        const needsReport = job.status === 'completed' && !job.completion_report_submitted;
        
        if (needsReport) {
        } else {
        }
        
        return needsReport;
      });
      return completionReportJobs;
    } else if (activeTab === 'past') {
      const pastJobs = jobs.filter(job => {
        // Show completed jobs
        const isJobCompleted = ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
        
        const shouldShow = isJobCompleted;
        
        if (shouldShow) {
        } else {
        }
        
        return shouldShow;
      });
      return pastJobs;
    }
    return jobs; // Return all jobs for other tabs
  };

  // Use useMemo to calculate tab counts efficiently and ensure they update when jobs change
  const tabs = useMemo(() => {
    const upcomingCount = jobs.filter(job => {
      const isAvailable = job.status === 'finding_interpreter';
      const isAssigned = job.status === 'assigned' || job.status === 'in_progress';
      const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
      return (isAvailable || isAssigned) && isNotCompleted;
    }).length;

    const completionReportsCount = jobs.filter(job => 
      job.status === 'completed' && !job.completion_report_submitted
    ).length;

    const pastJobsCount = jobs.filter(job => 
      ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status)
    ).length;

    return [
      { 
        id: 'upcoming', 
        name: 'Upcoming Jobs', 
        count: upcomingCount
      },
      { 
        id: 'completion_reports', 
        name: 'Completion Reports', 
        count: completionReportsCount
      },
      { 
        id: 'past', 
        name: 'Past Jobs', 
        count: pastJobsCount
      },
      { id: 'earnings', name: 'Earnings', count: null }
    ];
  }, [jobs]);

  const filters = [
    { value: 'all', label: 'All Jobs' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'completed', label: 'Completed' },
    { value: 'declined', label: 'Declined' }
  ];

  if (loading && getFilteredJobs().length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Job Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your interpretation assignments and track your earnings</p>
        </motion.div>


        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filters.map((filterOption) => (
                <option key={filterOption.value} value={filterOption.value}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Jobs List or Earnings Tab */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {activeTab === 'earnings' ? (
            // New Earnings Tab Content
            <div className="space-y-6">
              {/* Earnings Period Tabs */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { id: 'week', name: 'Last Week' },
                      { id: 'month', name: 'Last Month' },
                      { id: '6months', name: 'Last 6 Months' },
                      { id: 'year', name: 'Last Year' }
                    ].map((period) => (
                      <button
                        key={period.id}
                        onClick={() => setEarningsPeriod(period.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          earningsPeriod === period.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {period.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {earningsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : earnings ? (
                  <>
                    {/* Earnings Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.summary.total_earnings)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-8 w-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                            <p className="text-2xl font-bold text-gray-900">{earnings.summary.completed_jobs}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <ClockIcon className="h-8 w-8 text-purple-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Hours</p>
                            <p className="text-2xl font-bold text-gray-900">{earnings.summary.total_hours}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Avg. Per Job</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.summary.average_per_job)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Jobs */}
                    {earnings.recent_jobs && earnings.recent_jobs.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Completed Jobs</h4>
                        <div className="space-y-3">
                          {earnings.recent_jobs.slice(0, 5).map((job, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{job.job_number || job.title || `Job #${job.id}`}</p>
                                <p className="text-sm text-gray-500">{formatDate(job.scheduled_date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{formatCurrency(job.calculated_earnings)}</p>
                                <p className="text-sm text-gray-500">{job.calculated_hours} hours</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No earnings data available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Complete some jobs to see your earnings summary here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : getFilteredJobs().length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming jobs at the moment."
                  : activeTab === 'completion_reports'
                  ? "You don't have any jobs that need completion reports."
                  : "You don't have any past jobs yet."
                }
              </p>
            </div>
          ) : (
            <>
              {getFilteredJobs().map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => navigate(`/job/${job.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{job.job_number || job.title}</h3>
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="ml-1">{getJobStatusLabel(job.status)}</span>
                          </span>
                          {job.assignment_status && job.assignment_status !== job.status && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAssignmentStatusColor(job.assignment_status)}`}>
                              Assignment: {getAssignmentStatusLabel(job.assignment_status)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{job.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {formatDate(job.scheduled_date)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {formatTime(job.scheduled_time)} ({job.estimated_duration_minutes} min)
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          {job.is_remote ? 'Remote' : (
                            job.location_address || 
                              (job.location_city && job.location_state 
                                ? `${job.location_city}, ${job.location_state}` 
                                : 'Location TBD')
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-500">
                            <span className="font-medium">Languages:</span> {job.source_language_name || job.language_name || 'N/A'} → {job.target_language_name || 'English'}
                          </span>
                          <span className="text-gray-500">
                            <span className="font-medium">Type:</span> {job.service_type_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(calculateJobEarnings(job))}
                          </div>
                          <div className="text-xs text-gray-500">total earnings</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-end space-x-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/job/${job.id}`)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    
                    {job.status === 'finding_interpreter' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction(job.id, 'decline', { declined_reason: 'Not available' })}
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleJobAction(job.id, 'accept')}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </>
                    )}
                    
                    {(job.status === 'assigned' || job.status === 'reminders_sent') && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleJobAction(job.id, 'start')}
                        >
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Start Job
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowCompletionReport(true);
                          }}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Complete Job
                        </Button>
                        {isJobMoreThan24HoursAway(job) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to unassign yourself from this job? This action cannot be undone.')) {
                                const reason = prompt('Please provide a reason for unassigning (optional):');
                                handleJobAction(job.id, 'unassign', { unassign_reason: reason || '' });
                              }
                            }}
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Unassign
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            (Cannot unassign - less than 24 hours away)
                          </span>
                        )}
                      </>
                    )}

                    {job.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleJobAction(job.id, 'end')}
                        >
                          <StopIcon className="h-4 w-4 mr-1" />
                          End Job
                        </Button>
                      </>
                    )}
                    
                    {job.status === 'completed' && !job.completion_report_submitted && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedJob(job);
                          setShowCompletionReport(true);
                        }}
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        Submit Completion Report
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {/* Pagination - show for past jobs and other paginated tabs */}
              {getFilteredJobs().length > 0 && (activeTab === 'past' || (activeTab !== 'upcoming' && activeTab !== 'completion_reports')) && (
                <div className="flex items-center justify-between mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {getFilteredJobs().length} of {jobs.length} total jobs
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Upcoming jobs summary */}
              {activeTab === 'upcoming' && getFilteredJobs().length > 0 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {getFilteredJobs().length} upcoming jobs
                  </div>
                </div>
              )}
              
              {/* Completion reports summary */}
              {activeTab === 'completion_reports' && getFilteredJobs().length > 0 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {getFilteredJobs().length} jobs that need completion reports
                  </div>
                </div>
              )}

              {/* Completion Report Modal */}
              {showCompletionReport && selectedJob && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <InterpreterCompletionReport
                      jobId={selectedJob.id}
                      jobData={selectedJob}
                      onSubmit={(data) => {
                        setShowCompletionReport(false);
                        setSelectedJob(null);
                        loadJobs();
                        loadEarnings();
                        toast.success('Completion report submitted successfully!');
                      }}
                      onCancel={() => {
                        setShowCompletionReport(false);
                        setSelectedJob(null);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Mileage Prompt Modal */}
              {showMileagePrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 relative">
                    {/* Close Button */}
                    <button
                      onClick={() => {
                        setShowMileagePrompt(false);
                        setMileageRequested(0);
                        setMileageRate(0.70);
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                    
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
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rate per mile ($):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={FEDERAL_MILEAGE_CAP}
                          step="0.01"
                          value={mileageRate}
                          onChange={(e) => setMileageRate(Math.min(FEDERAL_MILEAGE_CAP, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.70"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Federal cap: ${FEDERAL_MILEAGE_CAP}/mile.
                        </p>
                        {mileageRequested > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Estimated reimbursement: ${(mileageRequested * Math.min(FEDERAL_MILEAGE_CAP, mileageRate || 0.70)).toFixed(2)}
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

export default JobDashboard;
