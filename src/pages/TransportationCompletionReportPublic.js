import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TransportationCompletionReportPublic = () => {
  const { jobId, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  
  // Time options for dropdowns
  const hourOptions = Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    value: String(i + 1).padStart(2, "0")
  }));

  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    label: String(i).padStart(2, "0"),
    value: String(i).padStart(2, "0")
  }));

  const periodOptions = [
    { label: "AM", value: "AM" },
    { label: "PM", value: "PM" }
  ];

  const [formData, setFormData] = useState({
    actual_pickup_time_hour: null,
    actual_pickup_time_minute: null,
    actual_pickup_time_period: null,
    actual_dropoff_time_hour: null,
    actual_dropoff_time_minute: null,
    actual_dropoff_time_period: null,
    actual_wait_time: '',
    notes: ''
  });

  useEffect(() => {
    loadJobDetails();
  }, [jobId, token]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/magic-link/transportation-jobs/${jobId}/report/${token}`);
      
      if (response.data.success) {
        const job = response.data.data;
        setJobDetails(job);
        
        // Pre-fill pickup time if scheduled pickup time exists
        if (job.pickup_time) {
          const pickupTime = parseTimeString(job.pickup_time);
          if (pickupTime) {
            setFormData(prev => ({
              ...prev,
              actual_pickup_time_hour: hourOptions.find(opt => opt.value === String(pickupTime.hour).padStart(2, "0")),
              actual_pickup_time_minute: minuteOptions.find(opt => opt.value === String(pickupTime.minute).padStart(2, "0")),
              actual_pickup_time_period: periodOptions.find(opt => opt.value === pickupTime.period)
            }));
          }
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

  const parseTimeString = (timeString) => {
    if (!timeString) return null;
    
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const timeParts = timeString.split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    
    // Convert to 12-hour format
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? "PM" : "AM";
    
    return {
      hour: hour12,
      minute: minute,
      period: period
    };
  };

  const getTimeString = (hour, minute, period) => {
    if (!hour || !minute || !period) return null;
    const h = parseInt(hour.value);
    const m = parseInt(minute.value);
    const p = period.value;
    
    // Convert to 24-hour format
    let hour24 = h;
    if (p === "AM" && h === 12) hour24 = 0;
    else if (p === "PM" && h !== 12) hour24 = h + 12;
    
    return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.actual_pickup_time_hour || !formData.actual_pickup_time_minute || !formData.actual_pickup_time_period) {
      alert('Please enter actual pickup time');
      return;
    }

    if (!formData.actual_dropoff_time_hour || !formData.actual_dropoff_time_minute || !formData.actual_dropoff_time_period) {
      alert('Please enter actual drop-off time');
      return;
    }

    // Validate wait time if provided
    if (formData.actual_wait_time !== '' && formData.actual_wait_time !== null) {
      const waitTime = parseInt(formData.actual_wait_time);
      if (isNaN(waitTime) || waitTime < 0) {
        alert('Wait time must be a non-negative number');
        return;
      }
    }

    // Convert times to strings
    const actualPickupTime = getTimeString(
      formData.actual_pickup_time_hour,
      formData.actual_pickup_time_minute,
      formData.actual_pickup_time_period
    );

    const actualDropoffTime = getTimeString(
      formData.actual_dropoff_time_hour,
      formData.actual_dropoff_time_minute,
      formData.actual_dropoff_time_period
    );

    // Validate drop-off time is after pickup time
    const pickupHour24 = formData.actual_pickup_time_period.value === "AM" && formData.actual_pickup_time_hour.value === "12"
      ? 0
      : formData.actual_pickup_time_period.value === "PM" && formData.actual_pickup_time_hour.value !== "12"
      ? parseInt(formData.actual_pickup_time_hour.value) + 12
      : parseInt(formData.actual_pickup_time_hour.value);
    
    const dropoffHour24 = formData.actual_dropoff_time_period.value === "AM" && formData.actual_dropoff_time_hour.value === "12"
      ? 0
      : formData.actual_dropoff_time_period.value === "PM" && formData.actual_dropoff_time_hour.value !== "12"
      ? parseInt(formData.actual_dropoff_time_hour.value) + 12
      : parseInt(formData.actual_dropoff_time_hour.value);

    const pickupMinutes = pickupHour24 * 60 + parseInt(formData.actual_pickup_time_minute.value);
    const dropoffMinutes = dropoffHour24 * 60 + parseInt(formData.actual_dropoff_time_minute.value);

    if (dropoffMinutes <= pickupMinutes) {
      alert('Drop-off time must be after pickup time');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/magic-link/transportation-jobs/${jobId}/report/${token}`,
        {
          actual_pickup_time: actualPickupTime,
          actual_dropoff_time: actualDropoffTime,
          actual_wait_time: formData.actual_wait_time ? parseInt(formData.actual_wait_time) : 0,
          notes: formData.notes
        }
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
          <button
            onClick={() => window.close()}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            Close this window
          </button>
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
            <h1 className="text-2xl font-bold mb-2">Submit Transportation Completion Report</h1>
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
                <div><strong>Trip Type:</strong> {jobDetails?.trip_type}</div>
                <div><strong>Service Type:</strong> {jobDetails?.transportation_service_type}</div>
                {jobDetails?.pickup_location && (
                  <div><strong>Pickup:</strong> {jobDetails.pickup_location}</div>
                )}
                {jobDetails?.dropoff_location && (
                  <div><strong>Drop-off:</strong> {jobDetails.dropoff_location}</div>
                )}
              </div>
            </div>

            {/* Actual Pickup Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Pickup Time <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={formData.actual_pickup_time_hour?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_pickup_time_hour: hourOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Hour</option>
                  {hourOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.actual_pickup_time_minute?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_pickup_time_minute: minuteOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Min</option>
                  {minuteOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.actual_pickup_time_period?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_pickup_time_period: periodOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">AM/PM</option>
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">The actual time the passenger was picked up</p>
            </div>

            {/* Actual Drop-off Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Drop-off Time <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={formData.actual_dropoff_time_hour?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_dropoff_time_hour: hourOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Hour</option>
                  {hourOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.actual_dropoff_time_minute?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_dropoff_time_minute: minuteOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Min</option>
                  {minuteOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={formData.actual_dropoff_time_period?.value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actual_dropoff_time_period: periodOptions.find(opt => opt.value === e.target.value)
                  })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">AM/PM</option>
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">The actual time the passenger was dropped off</p>
            </div>

            {/* Wait Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Wait Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={formData.actual_wait_time}
                onChange={(e) => setFormData({...formData, actual_wait_time: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter wait time in minutes (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">Total time spent waiting (e.g., at appointment location)</p>
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
                placeholder="Any additional notes about the trip..."
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
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default TransportationCompletionReportPublic;

