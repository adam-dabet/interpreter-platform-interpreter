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
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobWorkflow from '../components/JobWorkflow';
import { getJobStatusColor } from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobDetails = ({ jobId, setCurrentView }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJob(data.data);
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
                  {job.source_language_name} → {job.target_language_name}
                </p>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900 mt-1">{job.client_name}</p>
              </div>
            </div>
          </div>

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
