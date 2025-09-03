import React, { useState } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import InterpreterJobTimer from './InterpreterJobTimer';
import InterpreterCompletionReport from './InterpreterCompletionReport';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const InterpreterJobWorkflow = ({ job, onJobUpdate }) => {
  const [showCompletionReport, setShowCompletionReport] = useState(false);

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
    }
  ];

  const currentStepIndex = workflowSteps.findIndex(step => step.key === job.workflow_status) || 0;

  const getWorkflowStatusLabel = (status) => {
    const step = workflowSteps.find(s => s.key === status);
    return step ? step.label : 'Unknown';
  };

  const canSubmitCompletionReport = () => {
    return job.workflow_status === 'completed' && !job.completion_report_submitted;
  };

  const getPaymentInfo = () => {
    if (job.workflow_status === 'completed' || job.workflow_status === 'reported') {
      const actualHours = job.actual_duration_minutes / 60;
      const minimumHours = Math.max(1, actualHours); // Minimum 1 hour
      const paymentAmount = minimumHours * (job.hourly_rate || 0);
      
      return {
        actualHours: actualHours.toFixed(2),
        minimumHours: minimumHours.toFixed(2),
        paymentAmount: paymentAmount.toFixed(2)
      };
    }
    return null;
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
            Current: {getWorkflowStatusLabel(job.workflow_status)}
          </div>
        </div>
      </div>

      {/* Job Timer */}
      <InterpreterJobTimer 
        jobId={job.id} 
        jobStatus={job.workflow_status}
        onJobUpdate={onJobUpdate}
      />

      {/* Payment Information */}
      {getPaymentInfo() && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
            Payment Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Actual Time</div>
              <div className="text-lg font-semibold text-blue-900">
                {getPaymentInfo().actualHours} hours
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">Minimum Guarantee</div>
              <div className="text-lg font-semibold text-green-900">
                {getPaymentInfo().minimumHours} hours
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
              <strong>Payment Guarantee:</strong> You will be paid for at least 1 hour of work, even if the job takes less time.
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
        
        <div className="space-y-4">
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
        {job.workflow_status === 'assigned' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Next Step:</strong> Complete the job and submit your completion report.
            </div>
          </div>
        )}

          {job.workflow_status === 'completed' && !job.completion_report_submitted && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm text-orange-800">
                <strong>Job Completed:</strong> Please submit your completion report above to finalize the assignment.
              </div>
            </div>
          )}

          {job.workflow_status === 'reported' && (
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
              <div><span className="font-medium">Languages:</span> {job.source_language_name} → {job.target_language_name}</div>
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
