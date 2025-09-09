import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import InterpreterJobWorkflow from '../components/InterpreterJobWorkflow';
import { useAuth } from '../contexts/AuthContext';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getJobById(jobId);
      setJob(response.data.data);
    } catch (error) {
      console.error('Error loading job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (action, data = {}) => {
    try {
      setActionLoading(true);
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
      
      // Navigate back to job search
      navigate('/jobs/search');
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${action} job`;
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
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

  const calculateEarnings = (job) => {
    if (!profile?.service_rates || !job.estimated_duration_minutes) {
      return job.hourly_rate || 0;
    }

    const serviceRate = profile.service_rates.find(
      rate => rate.service_type_id === job.service_type_id
    );

    if (!serviceRate) {
      return job.hourly_rate || 0;
    }

    const hours = job.estimated_duration_minutes / 60;
    
    if (serviceRate.rate_unit === 'minutes') {
      return serviceRate.rate_amount * job.estimated_duration_minutes;
    } else {
      return serviceRate.rate_amount * hours;
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Job not found</h2>
          <p className="text-gray-600 mt-2">The job you're looking for doesn't exist or has been removed.</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/jobs/search')}
          >
            Back to Job Search
          </Button>
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
            <div>
              <button
                onClick={() => navigate('/jobs/search')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Job Search
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <div className="flex items-center mt-2 space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(job.priority)}`}>
                  {job.priority} Priority
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                  {job.job_type}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 leading-relaxed">{job.description}</p>
            </motion.div>

            {/* Job Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Date</p>
                      <p className="text-sm text-gray-600">{formatDate(job.scheduled_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Time</p>
                      <p className="text-sm text-gray-600">{formatTime(job.scheduled_time)} ({job.estimated_duration_minutes} minutes)</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {job.is_remote ? (
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                    ) : (
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">
                        {job.is_remote ? 'Remote Session' : `${job.location_city}, ${job.location_state}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Languages</p>
                    <p className="text-sm text-gray-600">{job.source_language_name} → {job.target_language_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Service Type</p>
                    <p className="text-sm text-gray-600">{job.service_type_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <p className="text-sm text-gray-600 capitalize">{job.status}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Claimant Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Claimant Information</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Claimant Name</p>
                    <p className="text-sm text-gray-600">
                      {job.claimant_first_name && job.claimant_last_name 
                        ? `${job.claimant_first_name} ${job.claimant_last_name}`
                        : job.client_name || 'N/A'
                      }
                    </p>
                  </div>
                </div>
                {job.claimant_phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{job.claimant_phone}</p>
                    </div>
                  </div>
                )}
                {job.claimant_address && (
                  <div className="flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">
                        {job.claimant_address}
                        {job.claimant_city && job.claimant_state && (
                          <span>, {job.claimant_city}, {job.claimant_state}</span>
                        )}
                        {job.claimant_zip_code && (
                          <span> {job.claimant_zip_code}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {job.client_email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Client Email</p>
                      <p className="text-sm text-gray-600">{job.client_email}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Earnings Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Earnings</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(calculateEarnings(job))}
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {profile?.service_rates ? 'Your earnings' : 'per hour'}
                </p>
                                        {profile?.service_rates && (
                          <div className="text-xs text-gray-400 mb-4">
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
                <div className="text-sm text-gray-600">
                  Duration: {job.estimated_duration_minutes} minutes
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {job.status === 'finding_interpreter' ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleJobAction('accept')}
                      disabled={actionLoading}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Processing...' : 'Accept Job'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleJobAction('decline')}
                      disabled={actionLoading}
                    >
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Processing...' : 'Decline Job'}
                    </Button>
                  </>
                ) : job.status === 'assigned' && job.assigned_interpreter_id ? (
                  <div className="text-center py-4">
                    <div className="text-lg font-semibold text-green-600 mb-2">
                      ✓ Job Accepted
                    </div>
                    <p className="text-sm text-gray-500">
                      This job has been assigned to you
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-lg font-semibold text-gray-600 mb-2">
                      Job Status: {job.status}
                    </div>
                    <p className="text-sm text-gray-500">
                      This job is not available for acceptance
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Job Workflow - Only show for assigned jobs */}
        {job.assigned_interpreter_id && (
          <div className="mt-8">
            <InterpreterJobWorkflow 
              job={job} 
              onJobUpdate={(updatedJob) => {
                setJob(updatedJob);
                loadJobDetails(); // Refresh the job data
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetails;


