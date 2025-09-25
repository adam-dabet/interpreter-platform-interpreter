import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import InterpreterCompletionReport from './InterpreterCompletionReport';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const InterpreterJobWorkflow = ({ job, onJobUpdate }) => {
  const [showCompletionReport, setShowCompletionReport] = useState(false);
  const [isEndingJob, setIsEndingJob] = useState(false);
  
  // Calculate actual duration from magic link timestamps if available
  const calculateActualDuration = () => {
    
    if (job.actual_duration_minutes) {
      return job.actual_duration_minutes;
    }
    
    if (job.job_started_at && job.job_ended_at) {
      const startTime = new Date(job.job_started_at);
      const endTime = new Date(job.job_ended_at);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      return durationMinutes > 0 ? durationMinutes : '';
    }
    
    return '';
  };
  
  const [actualDurationMinutes, setActualDurationMinutes] = useState(calculateActualDuration());

  // Recalculate duration when job data changes (e.g., after magic link completion)
  useEffect(() => {
    const newDuration = calculateActualDuration();
    if (newDuration !== actualDurationMinutes) {
      setActualDurationMinutes(newDuration);
    }
  }, [job.job_started_at, job.job_ended_at, job.actual_duration_minutes]);

  const workflowSteps = [
    { 
      key: 'assigned', 
      label: 'Assigned', 
      icon: CheckCircleIcon, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      key: 'in_progress', 
      label: 'Started', 
      icon: PlayIcon, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      icon: StopIcon, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      key: 'completion_report', 
      label: 'Reported', 
      icon: DocumentTextIcon, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const currentStepIndex = workflowSteps.findIndex(step => step.key === job.status) || 0;

  const getWorkflowStatusLabel = (status) => {
    const step = workflowSteps.find(s => s.key === status);
    return step ? step.label : 'Unknown';
  };

  const canSubmitCompletionReport = () => {
    return job.status === 'completed' && !job.completion_report_submitted;
  };

  const canEndJob = () => {
    return job.status === 'in_progress' && job.job_started_at;
  };

  const handleEndJob = async () => {
    setIsEndingJob(true);
    try {
      const token = localStorage.getItem('interpreterToken');
      const response = await fetch(`${API_BASE}/interpreters/jobs/${job.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actual_duration_minutes: actualDurationMinutes || 60 // Use input value or default to 1 hour
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Job completed successfully!');
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to end job');
      }
    } catch (error) {
      console.error('Error ending job:', error);
      toast.error('Failed to end job');
    } finally {
      setIsEndingJob(false);
    }
  };

  const handleUpdateActualDuration = async () => {
    if (!actualDurationMinutes || actualDurationMinutes <= 0) {
      toast.error('Please enter a valid actual duration');
      return;
    }

    try {
      const token = localStorage.getItem('interpreterToken');
      
      const response = await fetch(`${API_BASE}/interpreters/jobs/${job.id}/update-duration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actual_duration_minutes: parseInt(actualDurationMinutes)
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Actual duration updated successfully!');
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        console.error('Update duration error:', error);
        toast.error(error.message || 'Failed to update duration');
      }
    } catch (error) {
      console.error('Error updating duration:', error);
      toast.error('Failed to update duration');
    }
  };

  const getPaymentInfo = () => {
    if (job.status === 'completed' || job.status === 'completion_report') {
      const actualMinutes = actualDurationMinutes || job.actual_duration_minutes || 0;
      const bookedMinutes = job.estimated_duration_minutes || 0;
      const minimumMinutes = Math.max(bookedMinutes, actualMinutes); // Pay for booked time or actual time, whichever is higher
      
      // Determine if this is a legal appointment
      // Only court certified interpreters OR explicitly legal services (not medical-legal or non-legal)
      const isLegalAppointment = job.interpreter_type_code === 'court_certified' || 
                                 (job.service_type_name?.toLowerCase().includes('legal') && 
                                  !job.service_type_name?.toLowerCase().includes('non-legal') &&
                                  !job.service_type_name?.toLowerCase().includes('medical'));
      
      // Set increment based on appointment type
      const incrementMinutes = isLegalAppointment ? 180 : 15; // 3 hours for legal, 15 minutes for others
      
      
      const paymentAmount = calculateIncrementalPayment(minimumMinutes, job.hourly_rate || 0, incrementMinutes);
      
      return {
        actualMinutes: Math.round(actualMinutes),
        minimumMinutes: Math.round(minimumMinutes),
        bookedMinutes: Math.round(bookedMinutes),
        paymentAmount: paymentAmount.toFixed(2),
        actualHours: (actualMinutes / 60).toFixed(2),
        bookedHours: (bookedMinutes / 60).toFixed(2)
      };
    }
    return null;
  };

  const calculateIncrementalPayment = (totalMinutes, hourlyRate, incrementMinutes) => {
    if (totalMinutes <= 0) return 0;
    
    // Calculate how many increments we need
    const increments = Math.ceil(totalMinutes / incrementMinutes);
    const totalIncrementalMinutes = increments * incrementMinutes;
    const totalHours = totalIncrementalMinutes / 60;
    const payment = hourlyRate * totalHours;
    
    
    return payment;
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Job Progress</h3>
        
        {/* Workflow Steps */}
        <div className="flex items-center justify-between mb-6">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive ? step.bgColor : 'bg-gray-100'
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? step.color : 'text-gray-400'}`} />
                </div>
                <span className={`text-xs mt-2 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            workflowSteps[currentStepIndex]?.bgColor || 'bg-gray-100'
          } ${workflowSteps[currentStepIndex]?.color || 'text-gray-800'}`}>
            <ClockIcon className="h-4 w-4 mr-2" />
            Current: {getWorkflowStatusLabel(job.status)}
          </div>
        </div>
      </div>


      {/* Payment Information */}
      {getPaymentInfo() && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Payment Information
            {job.completion_report_submitted && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Locked
              </span>
            )}
          </h3>
          
          {/* Actual Time Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Time for Appointment (minutes)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={actualDurationMinutes}
                onChange={(e) => setActualDurationMinutes(e.target.value)}
                placeholder="Enter actual time in minutes"
                min="0"
                disabled={job.completion_report_submitted}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  job.completion_report_submitted 
                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={handleUpdateActualDuration}
                disabled={job.completion_report_submitted}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  job.completion_report_submitted
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Update
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {job.completion_report_submitted 
                ? 'Payment information is locked after completion report submission.'
                : 'Enter the actual time you spent on this assignment in minutes.'
              }
            </p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${job.completion_report_submitted ? 'relative' : ''}`}>
            {job.completion_report_submitted && (
              <div className="absolute inset-0 bg-gray-100 bg-opacity-75 rounded-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-1">Payment Information Locked</div>
                  <div className="text-xs text-gray-500">Cannot be modified after completion report submission</div>
                </div>
              </div>
            )}
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Actual Time</div>
              <div className="text-lg font-semibold text-blue-900">
                {getPaymentInfo().actualMinutes} minutes
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">Booked Time</div>
              <div className="text-lg font-semibold text-green-900">
                {getPaymentInfo().bookedMinutes} minutes
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600">Payment Amount</div>
              <div className="text-lg font-semibold text-purple-900">
                ${getPaymentInfo().paymentAmount}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>Payment Guarantee:</strong> You will be paid for the booked time ({getPaymentInfo().bookedMinutes} minutes) or actual time, whichever is higher.
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
        
        <div className="space-y-4">
          {/* End Job Button */}
          {canEndJob() && (
            <button
              onClick={handleEndJob}
              disabled={isEndingJob}
              className="w-full flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              {isEndingJob ? 'Ending Job...' : 'End Job'}
            </button>
          )}

          {/* Completion Report */}
          {canSubmitCompletionReport() && (
            <button
              onClick={() => setShowCompletionReport(true)}
              className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Submit Completion Report
            </button>
          )}

          {/* Status Messages */}
          {job.status === 'assigned' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Next Step:</strong> Start the job and then end it when complete.
              </div>
            </div>
          )}

          {job.status === 'in_progress' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Job In Progress:</strong> Click "End Job" when the assignment is complete.
              </div>
            </div>
          )}

          {job.status === 'completed' && !job.completion_report_submitted && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm text-orange-800">
                <strong>Job Completed:</strong> Please submit your completion report above to finalize the assignment.
              </div>
            </div>
          )}

          {job.status === 'completion_report' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Report Submitted:</strong> Your completion report has been submitted. Payment will be processed shortly.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job Details Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Assignment Information</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Job ID:</span> {job.id}</div>
              <div><span className="font-medium">Service Type:</span> {job.service_type_name || 'N/A'}</div>
              <div><span className="font-medium">Languages:</span> {job.source_language_name} → {job.target_language_name || 'English'}</div>
              <div><span className="font-medium">Rate:</span> ${job.hourly_rate || 0}/hour</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Location & Time</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Date:</span> {new Date(job.scheduled_date).toLocaleDateString()}</div>
              <div><span className="font-medium">Time:</span> {job.scheduled_time}</div>
              <div><span className="font-medium">Duration:</span> {job.estimated_duration_minutes} minutes</div>
              <div><span className="font-medium">Location:</span> {job.location_address || 'Remote'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Report Modal */}
      {showCompletionReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <InterpreterCompletionReport
              jobId={job.id}
              jobData={job}
              onSubmit={(data) => {
                setShowCompletionReport(false);
                if (onJobUpdate) {
                  onJobUpdate(data);
                }
              }}
              onCancel={() => setShowCompletionReport(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InterpreterJobWorkflow;
