import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AppointmentChangeModal = ({ job, changes, onClose, onConfirm }) => {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (canMakeIt) => {
    try {
      setResponding(true);
      const token = localStorage.getItem('interpreterToken');

      const response = await fetch(`${API_BASE}/jobs/${job.id}/confirm-availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation_status: canMakeIt ? 'confirmed' : 'declined',
          confirmation_notes: canMakeIt 
            ? 'Confirmed availability for updated appointment' 
            : 'Cannot make updated appointment time'
        })
      });

      if (response.ok) {
        toast.success(canMakeIt 
          ? 'Thank you! You have confirmed your availability.' 
          : 'Thank you for letting us know. You have been unassigned from this job.');
        if (onConfirm) {
          onConfirm(canMakeIt);
        }
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting confirmation:', error);
      toast.error('Failed to submit response');
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-600 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Appointment Changed</h2>
              <p className="text-sm text-gray-600 mt-1">
                {job.job_number} - {job.title || 'Interpretation Service'}
              </p>
            </div>
          </div>

          {/* Alert Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-900 font-medium">
              The appointment details have been updated. Please review the changes below and confirm if you can still make it.
            </p>
          </div>

          {/* Changes */}
          {changes && changes.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What Changed:</h3>
              <div className="space-y-2">
                {changes.map((change, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{change.fieldName || change.field}</div>
                        <div className="mt-1 text-sm">
                          <span className="text-red-600 line-through">{change.oldValue}</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-green-600 font-medium">{change.newValue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> The appointment details have been updated. Please review the current schedule below.
                </p>
              </div>
            </div>
          )}

          {/* Current/Updated Schedule Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Current Schedule:</h3>
            <div className="space-y-2 text-sm text-blue-800">
              {(job.newDate || job.scheduled_date) && (
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Date</div>
                    <div>{job.newDate || new Date(job.scheduled_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                  </div>
                </div>
              )}
              {(job.newTime || job.scheduled_time) && (
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Time</div>
                    <div>{job.newTime || (() => {
                      const [hours, minutes] = (job.scheduled_time || '').split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour % 12 || 12;
                      return `${displayHour}:${minutes} ${ampm}`;
                    })()}</div>
                  </div>
                </div>
              )}
              {job.arrival_time && (
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Arrival Time</div>
                    <div>{(() => {
                      const [hours, minutes] = (job.arrival_time || '').split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour % 12 || 12;
                      return `${displayHour}:${minutes} ${ampm}`;
                    })()}</div>
                  </div>
                </div>
              )}
              {(job.newDuration || job.estimated_duration_minutes) && (
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Duration</div>
                    <div>{job.newDuration || `${(job.estimated_duration_minutes / 60).toFixed(1)} hours`}</div>
                  </div>
                </div>
              )}
              {job.location_address && (
                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div>{job.is_remote ? 'Remote Session' : `${job.location_address}${job.location_city ? ', ' + job.location_city : ''}${job.location_state ? ', ' + job.location_state : ''}`}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
            <p className="text-lg font-semibold text-gray-900">
              Can you still make this appointment?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleResponse(true)}
              disabled={responding}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {responding ? 'Submitting...' : 'YES, I Can Make It'}
            </button>
            <button
              onClick={() => handleResponse(false)}
              disabled={responding}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              {responding ? 'Submitting...' : 'NO, I Cannot Make It'}
            </button>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={responding}
            className="w-full mt-3 px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Decide Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentChangeModal;



















