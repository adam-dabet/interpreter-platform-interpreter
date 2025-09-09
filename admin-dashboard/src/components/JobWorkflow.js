import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  DocumentTextIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobNotes from './JobNotes';
import { 
  JOB_STATUSES, 
  JOB_STATUS_LABELS, 
  getJobStatusColor, 
  getJobStatusLabel 
} from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobWorkflow = ({ job, onJobUpdate }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipDropdown, setShowSkipDropdown] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [validTransitions, setValidTransitions] = useState([]);
  const skipDropdownRef = useRef(null);

  const workflowSteps = [
    { 
      key: JOB_STATUSES.REQUESTED, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.REQUESTED], 
      icon: DocumentTextIcon, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      key: JOB_STATUSES.FINDING_INTERPRETER, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.FINDING_INTERPRETER], 
      icon: MagnifyingGlassIcon, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      key: JOB_STATUSES.ASSIGNED, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.ASSIGNED], 
      icon: UserPlusIcon, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    { 
      key: JOB_STATUSES.REMINDERS_SENT, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.REMINDERS_SENT], 
      icon: BellIcon, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    { 
      key: JOB_STATUSES.IN_PROGRESS, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.IN_PROGRESS], 
      icon: PlayIcon, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      key: JOB_STATUSES.COMPLETED, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.COMPLETED], 
      icon: StopIcon, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      key: JOB_STATUSES.COMPLETION_REPORT, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.COMPLETION_REPORT], 
      icon: DocumentTextIcon, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      key: JOB_STATUSES.BILLED, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.BILLED], 
      icon: CurrencyDollarIcon, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    { 
      key: JOB_STATUSES.CLOSED, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.CLOSED], 
      icon: CheckBadgeIcon, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    { 
      key: JOB_STATUSES.INTERPRETER_PAID, 
      label: JOB_STATUS_LABELS[JOB_STATUSES.INTERPRETER_PAID], 
      icon: CurrencyDollarIcon, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  const currentStepIndex = workflowSteps.findIndex(step => step.key === job.status) || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (skipDropdownRef.current && !skipDropdownRef.current.contains(event.target)) {
        setShowSkipDropdown(false);
      }
    };

    if (showSkipDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSkipDropdown]);

  const handleStatusTransition = async (newStatus, reason = '') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      console.log('Admin token:', token ? 'Present' : 'Missing');
      console.log('API URL:', `${API_BASE}/jobs/${job.id}/status`);
      console.log('Request body:', { status: newStatus, reason: reason });
      
      const response = await fetch(`${API_BASE}/jobs/${job.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reason: reason
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        toast.success(`Job status updated to ${getJobStatusLabel(newStatus)}`);
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        console.log('Error response:', error);
        console.log('Response status:', response.status);
        console.log('Response statusText:', response.statusText);
        toast.error(error.message || 'Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update job status');
    } finally {
      setIsLoading(false);
    }
  };

  const getValidTransitions = async (currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/jobs/${job.id}/status/transitions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Valid transitions API response:', data);
        // Extract validTransitions from the nested data structure
        const transitions = data.data?.validTransitions || [];
        return Array.isArray(transitions) ? transitions : [];
      } else {
        console.error('Failed to fetch valid transitions:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error fetching valid transitions:', error);
      return [];
    }
  };

  const handleSkipToStatus = async (targetStatus) => {
    console.log('handleSkipToStatus called with:', targetStatus);
    console.log('Current skipReason:', skipReason);
    
    if (!skipReason.trim()) {
      console.log('No reason provided, showing error');
      toast.error('Please provide a reason for skipping statuses');
      return;
    }

    console.log('Proceeding with status transition...');
    const reason = `Skipped to ${getJobStatusLabel(targetStatus)}: ${skipReason}`;
    await handleStatusTransition(targetStatus, reason);
    
    // Reset skip state
    setShowSkipDropdown(false);
    setSkipReason('');
  };

  const handleSendClaimantReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/admin/reminders/job/${job.id}/claimant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Claimant reminder sent successfully');
        // Don't call onJobUpdate for reminders as they don't change job data
      } else {
        toast.error(data.message || 'Failed to send claimant reminder');
      }
    } catch (error) {
      console.error('Error sending claimant reminder:', error);
      toast.error('Failed to send claimant reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInterpreter2DayReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/admin/reminders/job/${job.id}/interpreter-2day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Interpreter 2-day reminder sent successfully');
        // Don't call onJobUpdate for reminders as they don't change job data
      } else {
        toast.error(data.message || 'Failed to send interpreter 2-day reminder');
      }
    } catch (error) {
      console.error('Error sending interpreter 2-day reminder:', error);
      toast.error('Failed to send interpreter 2-day reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInterpreter1DayReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/admin/reminders/job/${job.id}/interpreter-1day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Interpreter 1-day reminder sent successfully');
        // Don't call onJobUpdate for reminders as they don't change job data
      } else {
        toast.error(data.message || 'Failed to send interpreter 1-day reminder');
      }
    } catch (error) {
      console.error('Error sending interpreter 1-day reminder:', error);
      toast.error('Failed to send interpreter 1-day reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInterpreter2HourReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/admin/reminders/job/${job.id}/interpreter-2hour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Interpreter 2-hour reminder sent successfully');
        // Don't call onJobUpdate for reminders as they don't change job data
      } else {
        toast.error(data.message || 'Failed to send interpreter 2-hour reminder');
      }
    } catch (error) {
      console.error('Error sending interpreter 2-hour reminder:', error);
      toast.error('Failed to send interpreter 2-hour reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInterpreter5MinuteReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/admin/reminders/job/${job.id}/interpreter-5minute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data && data.data.sent) {
          toast.success('Interpreter 5-minute reminder with magic link sent successfully');
          // Don't call onJobUpdate for reminders as they don't change job data
        } else {
          toast(data.message || 'Reminder was already sent');
        }
      } else {
        toast.error(data.message || 'Failed to send interpreter 5-minute reminder');
      }
    } catch (error) {
      console.error('Error sending interpreter 5-minute reminder:', error);
      toast.error('Failed to send interpreter 5-minute reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveJob = async () => {
    await handleStatusTransition(JOB_STATUSES.FINDING_INTERPRETER, 'Job approved and sent to interpreters');
  };

  const handleSendToInterpreters = async () => {
    await handleStatusTransition(JOB_STATUSES.FINDING_INTERPRETER, 'Job sent to interpreters for assignment');
  };

  const handleMarkBilled = async () => {
    await handleStatusTransition(JOB_STATUSES.BILLED, 'Job marked as billed');
  };

  const handleMarkClosed = async () => {
    await handleStatusTransition(JOB_STATUSES.CLOSED, 'Job closed');
  };

  const handleMarkInterpreterPaid = async () => {
    await handleStatusTransition(JOB_STATUSES.INTERPRETER_PAID, 'Interpreter payment processed');
  };

  const handleBillingAuthorization = async (authorized, notes = '') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${job.id}/billing-authorization`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorization_obtained: authorized,
          notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Billing authorization ${authorized ? 'obtained' : 'updated'}`);
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update billing authorization');
      }
    } catch (error) {
      console.error('Error updating billing authorization:', error);
      toast.error('Failed to update billing authorization');
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkflowStatusColor = (status) => {
    return getJobStatusColor(status);
  };

  const getWorkflowStatusLabel = (status) => {
    return getJobStatusLabel(status);
  };

  const needsBillingAuthorization = () => {
    // Billing authorization is required before job can start
    // This is needed when requestor's billing account differs from job's billing account
    return job.billing_authorization_required && !job.billing_authorization_obtained;
  };

  const canStartJob = () => {
    // Job can only start after billing authorization is obtained
    return job.workflow_status === 'authorized' || 
           (job.workflow_status === 'assigned' && !job.billing_authorization_required);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Status</h3>
        
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


      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Approve Job */}
          {job.status === JOB_STATUSES.REQUESTED && (
            <button
              onClick={handleApproveJob}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Approving...' : 'Approve Job'}
            </button>
          )}

          {/* Send to Interpreters */}
          {job.status === JOB_STATUSES.REQUESTED && (
            <button
              onClick={handleSendToInterpreters}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Sending...' : 'Send to Interpreters'}
            </button>
          )}

          {/* Individual Reminder Buttons */}
          {job.status === JOB_STATUSES.ASSIGNED && (
            <>
              <button
                onClick={handleSendClaimantReminder}
                disabled={isLoading || job.claimant_reminder_sent}
                className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : job.claimant_reminder_sent ? 'Claimant Reminder Sent' : 'Send Claimant Reminder'}
              </button>
              
              <button
                onClick={handleSendInterpreter2DayReminder}
                disabled={isLoading || job.interpreter_2day_reminder_sent}
                className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : job.interpreter_2day_reminder_sent ? '2-Day Reminder Sent' : 'Send 2-Day Reminder'}
              </button>
              
              <button
                onClick={handleSendInterpreter1DayReminder}
                disabled={isLoading || job.interpreter_1day_reminder_sent}
                className="flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : job.interpreter_1day_reminder_sent ? '1-Day Reminder Sent' : 'Send 1-Day Reminder'}
              </button>
              
              <button
                onClick={handleSendInterpreter2HourReminder}
                disabled={isLoading || job.interpreter_2hour_reminder_sent}
                className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : job.interpreter_2hour_reminder_sent ? '2-Hour Reminder Sent' : 'Send 2-Hour Reminder'}
              </button>
              
              <button
                onClick={handleSendInterpreter5MinuteReminder}
                disabled={isLoading || job.interpreter_5minute_reminder_sent}
                className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <BellIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : job.interpreter_5minute_reminder_sent ? '5-Min Magic Link Sent' : 'Send 5-Min Magic Link'}
              </button>
            </>
          )}

          {/* Mark as Billed */}
          {job.status === JOB_STATUSES.COMPLETION_REPORT && (
            <button
              onClick={handleMarkBilled}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Updating...' : 'Mark as Billed'}
            </button>
          )}

          {/* Mark as Closed */}
          {job.status === JOB_STATUSES.BILLED && (
            <button
              onClick={handleMarkClosed}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckBadgeIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Updating...' : 'Mark as Closed'}
            </button>
          )}

          {/* Mark Interpreter Paid */}
          {job.status === JOB_STATUSES.CLOSED && (
            <button
              onClick={handleMarkInterpreterPaid}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Updating...' : 'Mark Interpreter Paid'}
            </button>
          )}

          {/* Skip to Status */}
          <div className="relative" ref={skipDropdownRef}>
            <button
              onClick={async () => {
                if (!showSkipDropdown) {
                  // Fetch valid transitions when opening dropdown
                  const transitions = await getValidTransitions(job.status);
                  setValidTransitions(transitions);
                }
                setShowSkipDropdown(!showSkipDropdown);
              }}
              className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2" />
              Skip to Status
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            
            {showSkipDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Skip to Status</h4>
                  
                  {/* Reason Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Reason for skipping (required)
                    </label>
                    <textarea
                      value={skipReason}
                      onChange={(e) => setSkipReason(e.target.value)}
                      placeholder="e.g., Customer requested immediate assignment, Testing workflow..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows="2"
                    />
                  </div>
                  
                  {/* Status Options */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      // Ensure validTransitions is an array
                      const transitions = Array.isArray(validTransitions) ? validTransitions : [];
                      
                      // Only show valid transitions
                      const validSteps = workflowSteps.filter(step => 
                        transitions.includes(step.key) && step.key !== job.status
                      );
                      console.log('Current job status:', job.status);
                      console.log('Valid transitions:', transitions);
                      console.log('Available steps to skip to:', validSteps.map(s => ({ key: s.key, label: s.label })));
                      
                      if (validSteps.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            {transitions.length === 0 
                              ? 'Loading valid transitions...' 
                              : 'No valid status transitions available from current status'
                            }
                          </div>
                        );
                      }
                      
                      return validSteps.map((step) => {
                        const IconComponent = step.icon;
                        return (
                          <button
                            key={step.key}
                            onClick={(e) => {
                              console.log('Status button clicked:', step.key, step.label);
                              console.log('isLoading state:', isLoading);
                              e.preventDefault();
                              e.stopPropagation();
                              handleSkipToStatus(step.key);
                            }}
                            disabled={isLoading}
                            className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-md transition-colors ${
                              isLoading 
                                ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                                : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <IconComponent className={`h-4 w-4 mr-3 ${step.color}`} />
                            <span className="text-gray-900">{step.label}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Cancel Button */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowSkipDropdown(false);
                        setSkipReason('');
                      }}
                      className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {showNotes ? 'Hide Notes' : 'Show Notes'}
          </button>
        </div>

        {/* Status Indicators */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.status === JOB_STATUSES.REMINDERS_SENT || job.status === JOB_STATUSES.IN_PROGRESS || job.status === JOB_STATUSES.COMPLETED || job.status === JOB_STATUSES.COMPLETION_REPORT || job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Reminders {job.status === JOB_STATUSES.REMINDERS_SENT || job.status === JOB_STATUSES.IN_PROGRESS || job.status === JOB_STATUSES.COMPLETED || job.status === JOB_STATUSES.COMPLETION_REPORT || job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'Sent' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.status === JOB_STATUSES.COMPLETION_REPORT || job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Report {job.status === JOB_STATUSES.COMPLETION_REPORT || job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'Submitted' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Billing {job.status === JOB_STATUSES.BILLED || job.status === JOB_STATUSES.CLOSED || job.status === JOB_STATUSES.INTERPRETER_PAID ? 'Complete' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.status === JOB_STATUSES.INTERPRETER_PAID ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Payment {job.status === JOB_STATUSES.INTERPRETER_PAID ? 'Complete' : 'Pending'}
          </div>
        </div>
      </div>

      {/* Job Notes */}
      {showNotes && (
        <JobNotes jobId={job.id} />
      )}

      {/* Completion Report Display */}
      {job.completion_report_submitted && job.completion_report_data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
            Completion Report
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Timing Information</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Start Time:</span> {job.completion_report_data.start_time}</div>
                <div><span className="font-medium">End Time:</span> {job.completion_report_data.end_time}</div>
                <div><span className="font-medium">Submitted At:</span> {new Date(job.completion_report_submitted_at).toLocaleString()}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Job Results</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Result:</span> {job.completion_report_data.result}</div>
                <div><span className="font-medium">File Status:</span> {job.completion_report_data.file_status}</div>
                {job.completion_report_data.supporting_files && job.completion_report_data.supporting_files.length > 0 && (
                  <div>
                    <span className="font-medium">Files:</span> {job.completion_report_data.supporting_files.length} uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {job.completion_report_data.notes && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Additional Notes</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800">
                {job.completion_report_data.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobWorkflow;
