import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  CalendarIcon, 
  ClockIcon,
  MapPinIcon,
  UserIcon,
  LanguageIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobWorkflow from '../components/JobWorkflow';
import { getJobStatusColor } from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobDetails = ({ jobId, setCurrentView }) => {
  const [job, setJob] = useState(null);
  const [billingRates, setBillingRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [billingInfoExpanded, setBillingInfoExpanded] = useState(true);
  const [interpreterPaymentExpanded, setInterpreterPaymentExpanded] = useState(true);
  const [editingInterpreterPayment, setEditingInterpreterPayment] = useState(false);
  const [editingBillingInfo, setEditingBillingInfo] = useState(false);
  const [interpreterRate, setInterpreterRate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [actualDuration, setActualDuration] = useState('');

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Load job details
      const jobResponse = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        console.log('Job data received:', jobData.data);
        setJob(jobData.data);
        
        // Load billing rates for completed jobs
        if (jobData.data.status === 'completed' || jobData.data.status === 'completed_with_issues') {
          const ratesResponse = await fetch(`${API_BASE}/admin/jobs/${jobId}/billing-rates`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (ratesResponse.ok) {
            const ratesData = await ratesResponse.json();
            console.log('Billing rates data:', ratesData.data);
            setBillingRates(ratesData.data);
          } else {
            console.error('Failed to fetch billing rates:', ratesResponse.status);
          }
        }
      } else {
        toast.error('Failed to load job details');
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Job deleted successfully');
        setCurrentView('jobs');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveJob = async () => {
    if (!window.confirm('Are you sure you want to approve this appointment? It will be made available to interpreters.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Appointment approved successfully and sent to interpreters');
        loadJobDetails(); // Reload to show updated status
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error('Failed to approve appointment');
    }
  };

  const handleRejectJob = async () => {
    const reason = window.prompt('Please provide a reason for rejecting this appointment:');
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/reject`, {
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
        toast.success('Appointment rejected successfully');
        loadJobDetails(); // Reload to show updated status
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('Failed to reject appointment');
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

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getServiceCategoryDisplayName = (job) => {
    // Map interpreter type and language to service category
    const interpreterType = job.interpreter_type_code;
    const language = job.target_language_name?.toLowerCase();
    
    if (interpreterType === 'qualified_standard') {
      return 'General';
    } else if (interpreterType === 'court_certified') {
      return language === 'spanish' ? 'Legal - Spanish' : 'Legal - Non-Spanish';
    } else if (interpreterType === 'medical_certified') {
      return 'Medical Certified';
    }
    
    return 'N/A';
  };

  const calculateBillingTotal = (job, billingRates, type) => {
    console.log('Calculating billing total:', { job, billingRates, type });
    
    if (!billingRates || !billingRates.rates || billingRates.rates.length === 0) {
      console.log('No billing rates available');
      return '0.00';
    }
    
    const duration = type === 'actual' ? job.actual_duration_minutes : job.estimated_duration_minutes;
    if (!duration) {
      console.log('No duration available');
      return '0.00';
    }
    
    console.log('Duration:', duration);
    console.log('Available rates:', billingRates.rates);
    
    // Find the appropriate rate based on duration
    const rates = billingRates.rates.sort((a, b) => a.time_minutes - b.time_minutes);
    
    let total = 0;
    let remainingMinutes = duration;
    
    // Apply Time A rate first (minimum time)
    const timeARate = rates.find(rate => rate.rate_type === 'A');
    if (timeARate && remainingMinutes >= timeARate.time_minutes) {
      total += parseFloat(timeARate.rate_amount);
      remainingMinutes -= timeARate.time_minutes;
      console.log('Applied Time A rate:', timeARate.rate_amount, 'Remaining:', remainingMinutes);
    }
    
    // Apply Time B rate for additional time
    const timeBRate = rates.find(rate => rate.rate_type === 'B');
    if (timeBRate && remainingMinutes > 0) {
      const additionalPeriods = Math.ceil(remainingMinutes / timeBRate.time_minutes);
      total += parseFloat(timeBRate.rate_amount) * additionalPeriods;
      console.log('Applied Time B rate:', timeBRate.rate_amount, 'Periods:', additionalPeriods);
    }
    
    console.log('Final total:', total);
    return total.toFixed(2);
  };

  const calculateInterpreterPayment = (job, type) => {
    if (!job.hourly_rate) {
      return '0.00';
    }
    
    // Debug logging
    console.log('calculateInterpreterPayment - Job data:', {
      title: job.title,
      interpreter_type_code: job.interpreter_type_code,
      service_type_name: job.service_type_name,
      hourly_rate: job.hourly_rate,
      estimated_duration_minutes: job.estimated_duration_minutes,
      actual_duration_minutes: job.actual_duration_minutes
    });
    
    // Determine if this is a legal appointment
    // Only court certified interpreters OR explicitly legal services (not medical-legal or non-legal)
    const isLegalAppointment = job.interpreter_type_code === 'court_certified' || 
                               (job.service_type_name?.toLowerCase().includes('legal') && 
                                !job.service_type_name?.toLowerCase().includes('non-legal') &&
                                !job.service_type_name?.toLowerCase().includes('medical'));
    
    // Set increment based on appointment type
    const incrementMinutes = isLegalAppointment ? 180 : 15; // 3 hours for legal, 15 minutes for others
    
    console.log('Legal appointment detection:', {
      isLegalAppointment,
      incrementMinutes,
      type
    });
    
    if (type === 'estimated') {
      // For estimated payment, use incremental billing
      const duration = job.estimated_duration_minutes;
      if (!duration) return '0.00';
      
      const total = calculateIncrementalPayment(duration, parseFloat(job.hourly_rate), incrementMinutes);
      return total.toFixed(2);
    } else {
      // For actual payment, use minimum rate logic with incremental billing
      const actualMinutes = job.actual_duration_minutes || 0;
      const bookedMinutes = job.estimated_duration_minutes || 0;
      const minimumMinutes = Math.max(bookedMinutes, actualMinutes);
      
      if (minimumMinutes === 0) return '0.00';
      
      const total = calculateIncrementalPayment(minimumMinutes, parseFloat(job.hourly_rate), incrementMinutes);
      return total.toFixed(2);
    }
  };

  const calculateIncrementalPayment = (totalMinutes, hourlyRate, incrementMinutes) => {
    if (totalMinutes <= 0) return 0;
    
    // Calculate how many increments we need
    const increments = Math.ceil(totalMinutes / incrementMinutes);
    const totalIncrementalMinutes = increments * incrementMinutes;
    const totalHours = totalIncrementalMinutes / 60;
    const payment = hourlyRate * totalHours;
    
    console.log('Incremental payment calculation:', {
      totalMinutes,
      incrementMinutes,
      increments,
      totalIncrementalMinutes,
      totalHours,
      hourlyRate,
      payment
    });
    
    return payment;
  };

  const handleEditInterpreterPayment = () => {
    setInterpreterRate(job.hourly_rate || '');
    setEstimatedDuration(job.estimated_duration_minutes || '');
    setActualDuration(job.actual_duration_minutes || '');
    setEditingInterpreterPayment(true);
  };

  const handleSaveInterpreterPayment = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hourly_rate: parseFloat(interpreterRate) || job.hourly_rate,
          estimated_duration_minutes: parseInt(estimatedDuration) || job.estimated_duration_minutes,
          actual_duration_minutes: parseInt(actualDuration) || job.actual_duration_minutes
        })
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob.data);
        setEditingInterpreterPayment(false);
        toast.success('Interpreter payment updated successfully');
      } else {
        toast.error('Failed to update interpreter payment');
      }
    } catch (error) {
      console.error('Error updating interpreter payment:', error);
      toast.error('Failed to update interpreter payment');
    }
  };

  const handleCancelEdit = () => {
    setEditingInterpreterPayment(false);
    setEditingBillingInfo(false);
    setInterpreterRate('');
    setEstimatedDuration('');
    setActualDuration('');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Job not found</h3>
          <p className="mt-1 text-sm text-gray-500">The job you're looking for doesn't exist.</p>
          <button
            onClick={() => setCurrentView('jobs')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Jobs
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
                onClick={() => setCurrentView('jobs')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                <p className="mt-2 text-gray-600">Job Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {job.status === 'pending_authorization' ? (
                <>
                  <button
                    onClick={handleApproveJob}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Approve & Send to Interpreters
                  </button>
                  <button
                    onClick={handleRejectJob}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentView('edit-job', { jobId })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Edit Job
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete Job'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Job Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Job Number</label>
                <p className="text-sm text-gray-900 mt-1">{job.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900 mt-1">{job.description || 'No description provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Job Type</label>
                <p className="text-sm text-gray-900 mt-1 capitalize">{job.job_type}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Schedule
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(job.scheduled_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <p className="text-sm text-gray-900 mt-1">{formatTime(job.scheduled_time)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration</label>
                <p className="text-sm text-gray-900 mt-1">{job.estimated_duration_minutes} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900 mt-1">
                  {job.is_remote ? 'Remote' : 'In Person'}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
              Location
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_address || 'No address provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">City</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_city || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">State</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_state || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Zip Code</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_zip_code || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <LanguageIcon className="h-5 w-5 mr-2 text-blue-600" />
              Service Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Service Type</label>
                <p className="text-sm text-gray-900 mt-1">{job.service_type_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Languages</label>
                <p className="text-sm text-gray-900 mt-1">
                  {job.source_language_name || 'N/A'} → {job.target_language_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Interpreter Payment - Only show for completed jobs */}
          {(job.status === 'completed' || job.status === 'completed_with_issues') && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <div 
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => setInterpreterPaymentExpanded(!interpreterPaymentExpanded)}
                    >
                      <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Interpreter Payment
                    </div>
                    <div className="flex items-center space-x-2">
                      {!editingInterpreterPayment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInterpreterPayment();
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      )}
                      <div 
                        className="cursor-pointer p-1 rounded hover:bg-gray-100"
                        onClick={() => setInterpreterPaymentExpanded(!interpreterPaymentExpanded)}
                      >
                        {interpreterPaymentExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </h3>
                </div>
              </div>
              
              {interpreterPaymentExpanded && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.interpreter_first_name} {job.interpreter_last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter Rate</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={interpreterRate}
                          onChange={(e) => setInterpreterRate(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0.00"
                        />
                        <span className="text-sm text-gray-600">/ hour</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        ${job.hourly_rate ? parseFloat(job.hourly_rate).toFixed(2) : 'N/A'} / hour
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Duration</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          value={estimatedDuration}
                          onChange={(e) => setEstimatedDuration(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {job.estimated_duration_minutes} minutes ({formatDuration(job.estimated_duration_minutes)})
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Actual Duration</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          value={actualDuration}
                          onChange={(e) => setActualDuration(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {job.actual_duration_minutes !== null && job.actual_duration_minutes !== undefined 
                          ? `${job.actual_duration_minutes} minutes (${formatDuration(job.actual_duration_minutes)})`
                          : 'N/A minutes'
                        }
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Payment</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      ${calculateInterpreterPayment(job, 'estimated')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Actual Payment</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold text-green-600">
                      ${calculateInterpreterPayment(job, 'actual')}
                    </p>
                  </div>
                  
                  {editingInterpreterPayment && (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveInterpreterPayment}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Billing Information - Only show for completed jobs */}
          {(job.status === 'completed' || job.status === 'completed_with_issues') && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <div 
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => setBillingInfoExpanded(!billingInfoExpanded)}
                    >
                      <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                      Billing Information
                    </div>
                    <div className="flex items-center space-x-2">
                      {!editingBillingInfo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBillingInfo(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      )}
                      <div 
                        className="cursor-pointer p-1 rounded hover:bg-gray-100"
                        onClick={() => setBillingInfoExpanded(!billingInfoExpanded)}
                      >
                        {billingInfoExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </h3>
                </div>
              </div>
              
              {billingInfoExpanded && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.interpreter_first_name} {job.interpreter_last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service Category</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {getServiceCategoryDisplayName(job)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Billing Account</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.billing_account_name || 'N/A'}
                    </p>
                  </div>
                  
                  {/* Billing Account Rates - Time A first, then Time B */}
                  {billingRates && billingRates.rates && billingRates.rates.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Billing Account Rates</label>
                      <div className="mt-2 space-y-2">
                        {/* Sort rates to show Time A first, then Time B */}
                        {billingRates.rates
                          .sort((a, b) => a.rate_type.localeCompare(b.rate_type))
                          .map((rate, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                Time {rate.rate_type}
                              </span>
                              <p className="text-xs text-gray-600">
                                {formatDuration(rate.time_minutes)} minimum
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                ${parseFloat(rate.rate_amount).toFixed(2)}
                              </span>
                              <p className="text-xs text-gray-600">
                                per {formatDuration(rate.time_minutes)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Duration</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.estimated_duration_minutes} minutes ({formatDuration(job.estimated_duration_minutes)})
                    </p>
                  </div>
                  {job.actual_duration_minutes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Actual Duration</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {job.actual_duration_minutes} minutes ({formatDuration(job.actual_duration_minutes)})
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Total</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      ${calculateBillingTotal(job, billingRates, 'estimated')}
                    </p>
                  </div>
                  {job.actual_duration_minutes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Actual Total</label>
                      <p className="text-sm text-gray-900 mt-1 font-semibold text-green-600">
                        ${calculateBillingTotal(job, billingRates, 'actual')}
                      </p>
                    </div>
                  )}
                  
                  {editingBillingInfo && (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setEditingBillingInfo(false)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Additional Information */}
          {job.special_requirements && (
            <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                Special Requirements
              </h3>
              <p className="text-sm text-gray-900">{job.special_requirements}</p>
            </div>
          )}

          {/* Job Workflow */}
          <div className="lg:col-span-2">
            <JobWorkflow 
              job={job} 
              onJobUpdate={(updatedJob) => {
                setJob(updatedJob);
                toast.success('Job updated successfully');
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JobDetails;
