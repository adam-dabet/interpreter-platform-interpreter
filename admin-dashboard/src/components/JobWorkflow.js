import React, { useState } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  DocumentTextIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobNotes from './JobNotes';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobWorkflow = ({ job, onJobUpdate }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const workflowSteps = [
    { 
      key: 'assigned', 
      label: 'Assigned', 
      icon: CheckCircleIcon, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      key: 'authorized', 
      label: 'Authorized', 
      icon: CheckCircleIcon, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      key: 'started', 
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
      key: 'reported', 
      label: 'Reported', 
      icon: DocumentTextIcon, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      key: 'billed', 
      label: 'Billed', 
      icon: CheckCircleIcon, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    { 
      key: 'paid', 
      label: 'Paid', 
      icon: CheckCircleIcon, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  const currentStepIndex = workflowSteps.findIndex(step => step.key === job.workflow_status) || 0;

  const handleSendReminder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${job.id}/send-reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Claimant reminder sent successfully');
        if (onJobUpdate) {
          onJobUpdate({ ...job, claimant_reminder_sent: true });
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setIsLoading(false);
    }
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
    const step = workflowSteps.find(s => s.key === status);
    return step ? step.color : 'text-gray-600';
  };

  const getWorkflowStatusLabel = (status) => {
    const step = workflowSteps.find(s => s.key === status);
    return step ? step.label : 'Unknown';
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
            Current: {getWorkflowStatusLabel(job.workflow_status)}
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Claimant Reminder */}
          {!job.claimant_reminder_sent && (
            <button
              onClick={handleSendReminder}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <BellIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Sending...' : 'Send Claimant Reminder'}
            </button>
          )}

          {/* Billing Authorization */}
          {needsBillingAuthorization() && (
            <div className="space-y-2">
              <button
                onClick={() => handleBillingAuthorization(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Updating...' : 'Approve Billing'}
              </button>
              <button
                onClick={() => handleBillingAuthorization(false)}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Updating...' : 'Deny Billing'}
              </button>
            </div>
          )}

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
            <div className={`w-3 h-3 rounded-full mr-2 ${job.claimant_reminder_sent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Claimant Reminder {job.claimant_reminder_sent ? 'Sent' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.completion_report_submitted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Report {job.completion_report_submitted ? 'Submitted' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.billing_authorization_obtained ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Authorization {job.billing_authorization_obtained ? 'Obtained' : 'Pending'}
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${job.customer_billing_status === 'paid' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            Payment {job.customer_billing_status === 'paid' ? 'Received' : 'Pending'}
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
                <div><span className="font-medium">Status:</span> {job.completion_report_data.status}</div>
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
