import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadJobs();
    loadEarnings();
  }, [activeTab, filter, currentPage]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // For upcoming, completion_reports, and past jobs, load all jobs without pagination to get complete list
      // For other tabs, use pagination
      const params = (activeTab === 'upcoming' || activeTab === 'completion_reports' || activeTab === 'past')
        ? { limit: 100 } // Load more jobs for upcoming, completion_reports, and past tabs
        : {
            page: currentPage,
            limit: 10,
            ...(filter !== 'all' && { status: filter })
          };
      
      console.log('🔍 Loading jobs with params:', params);
      const response = await jobAPI.getMyJobs(params);
      console.log('📊 Jobs API response:', response);
      console.log('📋 Jobs data:', response.data.data.jobs);
      console.log('📊 Pagination info:', response.data.data.pagination);
      console.log('📊 Total jobs in response:', response.data.data.jobs.length);
      setJobs(response.data.data.jobs);
      setTotalPages(response.data.data.pagination.total_pages);
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await jobAPI.getEarnings();
      setEarnings(response.data.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const handleJobAction = async (jobId, action, data = {}) => {
    try {
      let response;
      switch (action) {
        case 'accept':
          response = await jobAPI.acceptJob(jobId, data);
          toast.success('Job accepted successfully!');
          break;
        case 'decline':
          response = await jobAPI.declineJob(jobId, data);
          toast.success('Job declined');
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

  // Filter jobs based on active tab
  const getFilteredJobs = () => {
    console.log('🔍 Filtering jobs for tab:', activeTab);
    console.log('📋 All jobs:', jobs);
    
    if (activeTab === 'upcoming') {
      const upcomingJobs = jobs.filter(job => {
        // Only show jobs that are assigned/in_progress but not completed
        const isAssigned = job.status === 'assigned' || job.status === 'in_progress';
        const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
        
        const shouldShow = isAssigned && isNotCompleted;
        
        if (shouldShow) {
          console.log(`✅ Including job: ${job.title} (status: ${job.status})`);
        } else {
          console.log(`❌ Excluding job: ${job.title} (status: ${job.status})`);
        }
        
        return shouldShow;
      });
      console.log('⏰ Upcoming jobs:', upcomingJobs);
      return upcomingJobs;
    } else if (activeTab === 'completion_reports') {
      const completionReportJobs = jobs.filter(job => {
        // Show jobs that need completion reports (completed but not submitted)
        const needsReport = job.status === 'completed' && !job.completion_report_submitted;
        
        if (needsReport) {
          console.log(`✅ Including completion report job: ${job.title} (status: ${job.status}, report submitted: ${job.completion_report_submitted})`);
        } else {
          console.log(`❌ Excluding job: ${job.title} (status: ${job.status}, report submitted: ${job.completion_report_submitted})`);
        }
        
        return needsReport;
      });
      console.log('📋 Completion report jobs:', completionReportJobs);
      return completionReportJobs;
    } else if (activeTab === 'past') {
      const pastJobs = jobs.filter(job => {
        // Show completed jobs
        const isJobCompleted = ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
        
        const shouldShow = isJobCompleted;
        
        if (shouldShow) {
          console.log(`✅ Including past job: ${job.title} (status: ${job.status})`);
        } else {
          console.log(`❌ Excluding past job: ${job.title} (status: ${job.status})`);
        }
        
        return shouldShow;
      });
      console.log('📚 Past jobs:', pastJobs);
      return pastJobs;
    }
    console.log('📄 All jobs (no filter):', jobs);
    return jobs; // Return all jobs for other tabs
  };

  const tabs = [
    { 
      id: 'upcoming', 
      name: 'Upcoming Jobs', 
      count: getFilteredJobs().length 
    },
    { 
      id: 'completion_reports', 
      name: 'Completion Reports', 
      count: jobs.filter(job => 
        job.status === 'completed' && !job.completion_report_submitted
      ).length 
    },
    { 
      id: 'past', 
      name: 'Past Jobs', 
      count: jobs.filter(job => 
        ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status)
      ).length 
    },
    { id: 'earnings', name: 'Earnings', count: null }
  ];

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

        {/* Earnings Summary */}
        {earnings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.summary.total_earnings)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{earnings.summary.completed_jobs}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{earnings.summary.total_hours}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Per Job</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.summary.average_per_job)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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

        {/* Jobs List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {loading ? (
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
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="ml-1">{getJobStatusLabel(job.status)}</span>
                          </span>
                          {job.status && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                              Job: {getJobStatusLabel(job.status)}
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
                          {job.is_remote ? 'Remote' : `${job.location_city}, ${job.location_state}`}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-500">
                            <span className="font-medium">Languages:</span> {job.source_language_name} → {job.target_language_name}
                          </span>
                          <span className="text-gray-500">
                            <span className="font-medium">Type:</span> {job.service_type_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(job.agreed_rate || job.hourly_rate)}
                          </div>
                          <div className="text-xs text-gray-500">per hour</div>
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
                    
                    {job.status === 'assigned' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setShowCompletionReport(true);
                        }}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Complete Job
                      </Button>
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
              
              {/* Pagination - only show for non-upcoming tabs */}
              {getFilteredJobs().length > 0 && activeTab !== 'upcoming' && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <div className="text-sm text-gray-600">
                    Showing {getFilteredJobs().length} of {jobs.length} total jobs
                  </div>
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default JobDashboard;
