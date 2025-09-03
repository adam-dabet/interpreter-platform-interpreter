import React, { useState } from 'react';
import { 
  ClockIcon, 
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const InterpreterCompletionReport = ({ jobId, jobData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    result: '',
    status: '',
    supporting_files: [],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resultOptions = [
    { value: 'completed', label: 'Completed Successfully' },
    { value: 'partial', label: 'Partially Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'no_show', label: 'No Show' }
  ];

  const statusOptions = [
    { value: 'on_time', label: 'On Time' },
    { value: 'late', label: 'Late' },
    { value: 'early', label: 'Early' },
    { value: 'delayed', label: 'Delayed' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      supporting_files: files
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.start_time || !formData.end_time || !formData.result || !formData.status) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('interpreterToken');
      
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('start_time', formData.start_time);
      submitData.append('end_time', formData.end_time);
      submitData.append('result', formData.result);
      submitData.append('status', formData.status);
      submitData.append('notes', formData.notes);
      
      // Add files
      formData.supporting_files.forEach(file => {
        submitData.append('supporting_files', file);
      });

      const response = await fetch(`${API_BASE}/interpreters/jobs/${jobId}/completion-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type for FormData, let browser set it
        },
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Completion report submitted successfully!');
        if (onSubmit) {
          onSubmit(result.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit completion report');
      }
    } catch (error) {
      console.error('Error submitting completion report:', error);
      toast.error('Failed to submit completion report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
          Assignment Completion Report
        </h2>
        <p className="text-gray-600 mt-2">
          Fill out the information below to submit the assignment status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Time Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Actual End time. We will pay the minimum agreed rate, but need actual end time for billing purposes.
            </p>
          </div>
        </div>

        {/* Result and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Result <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.result}
              onChange={(e) => handleInputChange('result', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select result</option>
              {resultOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>



        {/* Supporting Files */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload supporting files (optional)
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Choose Files
          </p>
          {formData.supporting_files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Selected files:</p>
              <ul className="text-xs text-gray-500 mt-1">
                {formData.supporting_files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
            placeholder="Any additional information about the assignment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>





        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
                          <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Submit
            </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterpreterCompletionReport;
