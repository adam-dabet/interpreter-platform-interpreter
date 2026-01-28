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
import { getApiBaseURL } from '../services/api';

const API_BASE = getApiBaseURL();

const InterpreterJobWorkflow = ({ job, onJobUpdate }) => {
  const [showCompletionReport, setShowCompletionReport] = useState(false);
  const [isEndingJob, setIsEndingJob] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignReason, setUnassignReason] = useState('');
  const [isUnassigning, setIsUnassigning] = useState(false);
  
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

  // Timer for jobs in progress
  useEffect(() => {
    let timerInterval = null;
    
    if (job.job_started_at && !job.job_ended_at && job.status === 'in_progress') {
      // Calculate initial elapsed time from when job was started
      const now = new Date();
      
      // Handle timezone issues by parsing the timestamp more carefully
      let startTime;
      
      // If the timestamp string contains timezone info, parse it more carefully
      if (typeof job.job_started_at === 'string' && job.job_started_at.includes('GMT')) {
        // Parse GMT timestamp more carefully
        startTime = new Date(job.job_started_at.replace('GMT-0700 (Pacific Daylight Time)', 'PDT'));
      } else {
        startTime = new Date(job.job_started_at);
      }
      
      const initialElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // If we get a negative time, there's definitely a timezone issue
      // In this case, let's start from 0 and let the user know
      const validElapsed = Math.max(0, initialElapsed);
      
      if (initialElapsed < 0) {
        console.warn('Timezone issue detected, starting timer from 0:', {
          startTimeString: job.job_started_at,
          startTimeParsed: startTime.toISOString(),
          nowTime: now.toISOString(),
          diff: initialElapsed
        });
      }
      
      setElapsedTime(validElapsed);
      
      // Update timer every second
      timerInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [job.job_started_at, job.job_ended_at, job.status]);

  // Format elapsed time for display
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

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

  const canUnassign = () => {
    // Can only unassign if job is assigned or reminders_sent and at least 48 hours away
    if (!['assigned', 'reminders_sent'].includes(job.status)) {
      return { allowed: false, reason: 'not-in-correct-status' };
    }

    const now = new Date();
    const jobDateTime = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
    const hoursUntilJob = (jobDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilJob <= 48) {
      return { allowed: false, reason: 'too-close' };
    }

    return { allowed: true };
  };

  const handleUnassign = async () => {
    try {
      setIsUnassigning(true);
      const token = localStorage.getItem('interpreterToken');
      
      const response = await fetch(`${API_BASE}/jobs/${job.id}/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          unassign_reason: unassignReason || 'Provider requested to unassign'
        })
      });

      if (response.ok) {
        toast.success('Successfully unassigned from this job');
        setShowUnassignModal(false);
        setUnassignReason('');
        // Redirect or update the job list
        window.location.href = '/jobs';
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to unassign from job');
      }
    } catch (error) {
      console.error('Error unassigning from job:', error);
      toast.error('Failed to unassign from job');
    } finally {
      setIsUnassigning(false);
    }
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

      {/* Live Timer - Only show when job is in progress */}
      {job.status === 'in_progress' && job.job_started_at && !job.job_ended_at && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
            Job in Progress
          </h3>
          
          <div className="text-center">
            <div className="inline-flex items-center bg-white rounded-lg px-6 py-4 shadow-sm border border-blue-200">
              <div className="text-4xl font-mono font-bold text-blue-600 mr-4">
                {formatElapsedTime(elapsedTime)}
              </div>
              <div className="text-sm text-blue-700">
                <div className="font-medium">Elapsed Time</div>
                <div className="text-xs text-blue-600">
                  Started: {new Date(job.job_started_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-blue-700">
              <p className="font-medium">Your job is currently running</p>
              <p className="text-blue-600">Click "End Job" when the appointment is complete</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        
        <div className="space-y-4">
          {/* Unassign Button or Message */}
          {['assigned', 'reminders_sent'].includes(job.status) && (() => {
            const unassignCheck = canUnassign();
            if (unassignCheck.allowed) {
              return (
                <button
                  onClick={() => setShowUnassignModal(true)}
                  className="w-full flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  Unassign from Job
                </button>
              );
            } else if (unassignCheck.reason === 'too-close') {
              return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Cannot Unassign:</strong> This job is less than 2 days away. If you can no longer make this appointment, please call us at <strong>(555) 123-4567</strong> immediately.
                    </div>
                  </div>
                </div>
              );
            }
          })()}

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

          {/* Completion Report Button */}
          {canSubmitCompletionReport() && (
            <button
              onClick={() => setShowCompletionReport(true)}
              data-completion-report-trigger="true"
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

          {job.status === 'completion_report' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Report Submitted:</strong> Your completion report has been submitted. Payment will be processed shortly.
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Unassign Modal */}
      {showUnassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unassign from Job</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to unassign yourself from this job? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                placeholder="Please provide a reason for unassigning..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                maxLength={500}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnassignModal(false);
                  setUnassignReason('');
                }}
                disabled={isUnassigning}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassign}
                disabled={isUnassigning}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isUnassigning ? 'Unassigning...' : 'Unassign'}
              </button>
            </div>
          </div>
        </div>
      )}


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
