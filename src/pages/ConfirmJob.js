import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ConfirmJob = () => {
  const { jobId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadJobDetails();
  }, [jobId, token]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/magic-link/jobs/${jobId}/confirm/${token}`);
      
      if (response.data.success) {
        setJobDetails(response.data.data);
      } else {
        setError(response.data.message || 'Invalid or expired confirmation link');
      }
    } catch (err) {
      console.error('Error loading job details:', err);
      setError(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const response = await axios.post(`${API_BASE}/magic-link/jobs/${jobId}/confirm/${token}`);
      
      if (response.data.success) {
        setConfirmed(true);
      } else {
        setError(response.data.message || 'Failed to confirm job');
      }
    } catch (err) {
      console.error('Error confirming job:', err);
      setError(err.response?.data?.message || 'Failed to confirm job');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Job</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.href = '/login'}>
            Login to Portal
          </Button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <CheckCircleIcon className="h-20 w-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirmed!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for confirming your attendance. We'll see you on{' '}
            {jobDetails && formatDate(jobDetails.scheduled_date)} at{' '}
            {jobDetails && formatTime(jobDetails.scheduled_time)}.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              Go to Interpreter Portal
            </Button>
            <button
              onClick={() => window.close()}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Close this window
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-blue-600 p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Confirm Your Attendance</h1>
            <p className="text-blue-100">Please confirm that you will be attending this appointment</p>
          </div>

          {/* Job Details */}
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-32">Job Number:</span>
                  <span className="text-gray-900">{jobDetails?.job_number}</span>
                </div>

                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {jobDetails && formatDate(jobDetails.scheduled_date)}
                    </div>
                    <div className="text-gray-600">
                      {jobDetails && formatTime(jobDetails.scheduled_time)}
                      {jobDetails?.estimated_duration_minutes && ` (${jobDetails.estimated_duration_minutes} minutes)`}
                    </div>
                  </div>
                </div>

                {!jobDetails?.is_remote && (
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-gray-900">
                      {jobDetails?.location_address && <div>{jobDetails.location_address}</div>}
                      <div>{jobDetails?.location_city}, {jobDetails?.location_state} {jobDetails?.location_zip}</div>
                    </div>
                  </div>
                )}

                {jobDetails?.is_remote && (
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <span className="text-gray-900 font-medium">Remote (Virtual)</span>
                  </div>
                )}

                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-32">Service:</span>
                  <span className="text-gray-900">{jobDetails?.service_type_name}</span>
                </div>

                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-32">Language:</span>
                  <span className="text-gray-900">{jobDetails?.language_name}</span>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-900">Important</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    By confirming, you are committing to attend this appointment. 
                    If you cannot attend, please contact us immediately at 888-418-2565.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
              >
                {confirming ? 'Confirming...' : 'Yes, I Confirm My Attendance'}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Login to Interpreter Portal for more options
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConfirmJob;

