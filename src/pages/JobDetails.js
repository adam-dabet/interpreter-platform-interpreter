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
  EnvelopeIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import InterpreterJobWorkflow from '../components/InterpreterJobWorkflow';
import { useAuth } from '../contexts/AuthContext';
import { useJobRestrictions } from '../contexts/JobRestrictionContext';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { canAcceptJobs, showJobAcceptanceBlocked } = useJobRestrictions();
  const { profile } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [mileageRequested, setMileageRequested] = useState(0);
  const [mileagePromptLoading, setMileagePromptLoading] = useState(false);

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
          // Check if user can accept jobs (no overdue reports)
          if (!canAcceptJobs()) {
            showJobAcceptanceBlocked();
            setActionLoading(false);
            return;
          }
          // Show mileage prompt before accepting
          setShowMileagePrompt(true);
          setActionLoading(false);
          return; // Don't proceed with acceptance yet
        case 'decline':
          response = await jobAPI.declineJob(jobId, data);
          toast.success('Job declined');
          break;
        case 'start':
          response = await jobAPI.startJob(jobId);
          toast.success('Job started successfully!');
          // Reload job details to show updated status
          await loadJobDetails();
          return; // Don't navigate away
        case 'end':
          response = await jobAPI.endJob(jobId);
          toast.success('Job ended successfully!');
          // Reload job details to show updated status
          await loadJobDetails();
          return; // Don't navigate away
        default:
          return;
      }
      
      // Navigate back to job search (only for accept/decline)
      navigate('/jobs/search');
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      const errorMessage = error.response?.data?.message || `Failed to ${action} job`;
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmation = async (confirmationStatus) => {
    try {
      setConfirmationLoading(true);
      
      const response = await jobAPI.confirmAvailability(jobId, {
        confirmation_status: confirmationStatus,
        confirmation_notes: confirmationNotes
      });
      
      if (response.data.success) {
        toast.success(`Availability ${confirmationStatus} successfully!`);
        setShowConfirmationModal(false);
        setConfirmationNotes('');
        
        // Refresh job details
        await loadJobDetails();
        
        // If declined, navigate back to job search
        if (confirmationStatus === 'declined') {
          navigate('/jobs/search');
        }
      }
    } catch (error) {
      console.error('Error confirming availability:', error);
      const errorMessage = error.response?.data?.message || 'Failed to confirm availability';
      toast.error(errorMessage);
    } finally {
      setConfirmationLoading(false);
    }
  };

  const handleMileageSubmit = async () => {
    // Double-check restriction before submitting
    if (!canAcceptJobs()) {
      showJobAcceptanceBlocked();
      return;
    }
    
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(jobId, { 
        mileage_requested: mileageRequested 
      });
      
      toast.success('Job accepted successfully! Your mileage request is pending admin approval.');
      setShowMileagePrompt(false);
      setMileageRequested(0);
      
      // Navigate back to job search
      navigate('/jobs/search');
    } catch (error) {
      console.error('Error submitting mileage request:', error);
      toast.error(`Failed to submit mileage request: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  const handleNoMileage = async () => {
    // Double-check restriction before submitting
    if (!canAcceptJobs()) {
      showJobAcceptanceBlocked();
      return;
    }
    
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(jobId, {});
      
      toast.success('Job accepted successfully!');
      setShowMileagePrompt(false);
      setMileageRequested(0);
      
      // Navigate back to job search
      navigate('/jobs/search');
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error(`Failed to accept job: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
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
    let basePayment = 0;
    
    // If interpreter has custom service rates, calculate based on those
    if (profile?.service_rates && job.estimated_duration_minutes) {
      const serviceRate = profile.service_rates.find(
        rate => rate.service_type_id === job.service_type_id
      );
      
      if (serviceRate && serviceRate.rate_amount) {
        const hours = job.estimated_duration_minutes / 60;
        
        if (serviceRate.rate_unit === 'minutes') {
          basePayment = serviceRate.rate_amount * job.estimated_duration_minutes;
        } else {
          basePayment = serviceRate.rate_amount * hours;
        }
      }
    }

    // Otherwise, use the job's total_amount (calculated by backend) if it's greater than 0
    if (basePayment === 0) {
      const totalAmount = parseFloat(job.total_amount) || 0;
      if (totalAmount > 0) {
        basePayment = totalAmount;
      }
    }

    // Fallback: calculate from hourly rate and duration
    if (basePayment === 0 && job.hourly_rate && job.estimated_duration_minutes) {
      const hours = job.estimated_duration_minutes / 60;
      basePayment = parseFloat(job.hourly_rate) * hours;
    }
    
    // Add mileage reimbursement if available
    const mileageReimbursement = parseFloat(job.mileage_reimbursement) || 0;
    
    return basePayment + mileageReimbursement;
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
              <h1 className="text-3xl font-bold text-gray-900">{job.job_number || job.title}</h1>
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
                        {job.is_remote ? 'Remote Session' : (job.location_address || `${job.location_city}, ${job.location_state}`)}
                      </p>
                    </div>
                  </div>
                  {job.location_contact_name && (
                    <div className="flex items-start">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Location Contact</p>
                        <p className="text-sm text-gray-600">{job.location_contact_name}</p>
                        {(job.location_contact_phone || job.facility_phone) && (
                          <p className="text-sm text-gray-600">{job.location_contact_phone || job.facility_phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {!job.location_contact_name && job.facility_phone && (
                    <div className="flex items-start">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Facility Phone</p>
                        <p className="text-sm text-gray-600">{job.facility_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Languages</p>
                    <p className="text-sm text-gray-600">{job.source_language_name || job.language_name || 'N/A'} → {job.target_language_name || 'English'}</p>
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
                      {job.claimant_name || job.client_name || 'N/A'}
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

            {/* Completion Report */}
            {job.completion_report_submitted && job.completion_report_data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center mb-4 bg-green-50 -m-6 p-4 rounded-t-lg border-b border-green-200">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-green-900">Completion Report</h2>
                    <p className="text-sm text-green-700 mt-1">
                      Submitted on {new Date(job.completion_report_data.submitted_at || job.completion_report_submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {job.completion_report_data.start_time && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Start Time</p>
                      <p className="text-sm text-gray-900 mt-1">{job.completion_report_data.start_time}</p>
                    </div>
                  )}
                  
                  {job.completion_report_data.end_time && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">End Time</p>
                      <p className="text-sm text-gray-900 mt-1">{job.completion_report_data.end_time}</p>
                    </div>
                  )}
                  
                  {job.completion_report_data.start_time && job.completion_report_data.end_time && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Duration</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {(() => {
                          try {
                            const start = new Date(`2000-01-01 ${job.completion_report_data.start_time}`);
                            const end = new Date(`2000-01-01 ${job.completion_report_data.end_time}`);
                            const diffMs = end - start;
                            const diffMins = Math.round(diffMs / 60000);
                            const hours = Math.floor(diffMins / 60);
                            const mins = diffMins % 60;
                            return `${hours}h ${mins}m`;
                          } catch (e) {
                            return 'N/A';
                          }
                        })()}
                      </p>
                    </div>
                  )}
                  
                  {job.completion_report_data.result && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Result</p>
                      <p className="text-sm text-gray-900 mt-1 capitalize">
                        {job.completion_report_data.result.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  
                  {job.completion_report_data.file_status && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">File Status</p>
                      <p className="text-sm text-gray-900 mt-1 capitalize">
                        {job.completion_report_data.file_status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                </div>
                
                {job.completion_report_data.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="text-sm text-gray-900 mt-2">{job.completion_report_data.notes}</p>
                  </div>
                )}
                
                {job.completion_report_data.follow_up_date && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-4">Follow-up Appointment</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(job.completion_report_data.follow_up_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      
                      {job.completion_report_data.follow_up_time && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Time</p>
                          <p className="text-sm text-gray-900 mt-1">{job.completion_report_data.follow_up_time}</p>
                        </div>
                      )}
                      
                      {job.completion_report_data.follow_up_formatted_address && (
                        <div className="md:col-span-2">
                          <p className="text-sm font-medium text-gray-500">Location</p>
                          <p className="text-sm text-gray-900 mt-1">{job.completion_report_data.follow_up_formatted_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
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
                  Total earnings for this job
                </p>
                        <div className="text-xs text-gray-400 mb-4">
                          {(() => {
                            const hours = job.estimated_duration_minutes / 60;
                            if (profile?.service_rates) {
                              const serviceRate = profile.service_rates.find(
                                rate => rate.service_type_id === job.service_type_id
                              );
                              if (serviceRate && serviceRate.rate_amount && serviceRate.rate_unit) {
                                if (serviceRate.rate_unit === 'minutes') {
                                  return `${formatCurrency(serviceRate.rate_amount)}/min × ${job.estimated_duration_minutes} min = ${formatCurrency(serviceRate.rate_amount * job.estimated_duration_minutes)}`;
                                } else {
                                  return `${formatCurrency(serviceRate.rate_amount)}/hour × ${hours.toFixed(1)} hours = ${formatCurrency(serviceRate.rate_amount * hours)}`;
                                }
                              }
                            }
                            if (job.hourly_rate) {
                              return `${formatCurrency(job.hourly_rate)}/hour × ${hours.toFixed(1)} hours = ${formatCurrency(job.hourly_rate * hours)}`;
                            }
                            return 'Rate not set';
                          })()}
                        </div>
                {job.mileage_reimbursement && parseFloat(job.mileage_reimbursement) > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-600">Base Rate:</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(calculateEarnings(job) - parseFloat(job.mileage_reimbursement))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Mileage ({job.mileage_requested || 0} mi):</span>
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(parseFloat(job.mileage_reimbursement))}
                      </span>
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600 mt-4">
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
                    {job.confirmation_status === 'pending' ? (
                      <div>
                        <div className="text-lg font-semibold text-orange-600 mb-2">
                          ⚠️ Availability Confirmation Required
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                          Please confirm if you can still make this appointment.
                        </p>
                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => setShowConfirmationModal(true)}
                            disabled={confirmationLoading}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Confirm Availability
                          </Button>
                        </div>
                      </div>
                    ) : job.confirmation_status === 'confirmed' ? (
                      <div>
                        <div className="text-lg font-semibold text-green-600 mb-2">
                          ✓ Availability Confirmed
                        </div>
                        <p className="text-sm text-gray-500">
                          You have confirmed you can make the appointment
                        </p>
                      </div>
                    ) : job.confirmation_status === 'declined' ? (
                      <div>
                        <div className="text-lg font-semibold text-red-600 mb-2">
                          ✗ Availability Declined
                        </div>
                        <p className="text-sm text-gray-500">
                          You have declined this appointment
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-lg font-semibold text-green-600 mb-2">
                          ✓ Job Accepted
                        </div>
                        <p className="text-sm text-gray-500">
                          This job has been assigned to you
                        </p>
                      </div>
                    )}
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

            {/* Job Timing Controls - Show for assigned jobs */}
            {job.status === 'assigned' || job.status === 'reminders_sent' || job.status === 'in_progress' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Job Timing
                </h3>
                
                <div className="space-y-4">
                  {/* Job Status Display */}
                  <div className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      job.status === 'in_progress' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      <ClockIcon className="h-4 w-4 mr-2" />
                      Status: {job.status === 'in_progress' ? 'In Progress' : 'Ready to Start'}
                    </div>
                  </div>

                  {/* Start/End Job Buttons */}
                  <div className="space-y-3">
                    {(job.status === 'assigned' || job.status === 'reminders_sent') && (
                      <Button
                        className="w-full"
                        onClick={() => handleJobAction('start')}
                        disabled={actionLoading}
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Starting...' : 'Start Job'}
                      </Button>
                    )}
                    
                    {job.status === 'in_progress' && (
                      <Button
                        className="w-full"
                        onClick={() => handleJobAction('end')}
                        disabled={actionLoading}
                      >
                        <StopIcon className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Ending...' : 'End Job'}
                      </Button>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="text-sm text-gray-600 text-center">
                    {job.status === 'in_progress' ? (
                      <p>Click "End Job" when the appointment is complete</p>
                    ) : (
                      <p>Click "Start Job" when you arrive at the appointment location</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
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

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Availability
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {job.confirmation_reason === 'schedule_change' 
                ? 'The appointment time has been changed. Can you still make it to this appointment?'
                : 'Please confirm your availability for this upcoming appointment.'
              }
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={confirmationNotes}
                onChange={(e) => setConfirmationNotes(e.target.value)}
                placeholder="Add any notes about your availability..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={500}
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setConfirmationNotes('');
                }}
                disabled={confirmationLoading}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleConfirmation('declined')}
                disabled={confirmationLoading}
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                {confirmationLoading ? 'Processing...' : 'Decline'}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleConfirmation('confirmed')}
                disabled={confirmationLoading}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {confirmationLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
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
    </div>
  );
};

export default JobDetails;


