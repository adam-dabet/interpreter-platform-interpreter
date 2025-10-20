import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CompletionReportPublic = () => {
  const { jobId, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    result: 'completed',
    file_status: 'obtained',
    notes: ''
  });

  useEffect(() => {
    loadJobDetails();
  }, [jobId, token]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/magic-link/jobs/${jobId}/report/${token}`);
      
      if (response.data.success) {
        const job = response.data.data;
        setJobDetails(job);
        
        // Pre-fill times if job has start/end times
        if (job.job_started_at) {
          const startTime = new Date(job.job_started_at);
          setFormData(prev => ({
            ...prev,
            start_time: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          }));
        }
        if (job.job_ended_at) {
          const endTime = new Date(job.job_ended_at);
          setFormData(prev => ({
            ...prev,
            end_time: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          }));
        }
      } else {
        setError(response.data.message || 'Invalid or expired report link');
      }
    } catch (err) {
      console.error('Error loading job details:', err);
      setError(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.start_time || !formData.end_time) {
      alert('Please enter both start and end times');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/magic-link/jobs/${jobId}/report/${token}`,
        formData
      );
      
      if (response.data.success) {
        setSubmitted(true);
      } else {
        setError(response.data.message || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Report</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.href = '/login'}>
            Login to Portal
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <CheckCircleIcon className="h-20 w-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Submitted!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for submitting your completion report. Your payment will be processed shortly.
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
            <h1 className="text-2xl font-bold mb-2">Submit Completion Report</h1>
            <p className="text-blue-100">Complete this report for job {jobDetails?.job_number}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Job Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-gray-900 mb-2">Job Summary</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>Job:</strong> {jobDetails?.job_number}</div>
                <div><strong>Date:</strong> {jobDetails && new Date(jobDetails.scheduled_date).toLocaleDateString()}</div>
                <div><strong>Service:</strong> {jobDetails?.service_type_name}</div>
                <div><strong>Language:</strong> {jobDetails?.language_name}</div>
              </div>
            </div>

            {/* Start Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Result */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.result}
                onChange={(e) => setFormData({...formData, result: e.target.value})}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="completed">Completed</option>
                <option value="claimant_no_show">Claimant No Show</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* File Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Status <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.file_status}
                onChange={(e) => setFormData({...formData, file_status: e.target.value})}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="obtained">File Obtained</option>
                <option value="not_obtained">File Not Obtained</option>
                <option value="no_file">No File to Obtain</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Any additional notes about the job..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Completion Report'}
            </Button>

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Login to Portal for advanced options
              </a>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CompletionReportPublic;

