import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Button from './ui/Button';

const JobCard = ({ 
  job, 
  variant = 'default', // 'default', 'compact', 'detailed'
  showActions = true,
  showProgress = true,
  onClick,
  onShowCompletionReport // New prop for completion report callback
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Determine job status and next action
  const getJobStatus = () => {
    if (job.completion_report_submitted) return 'completed';
    if (job.status === 'completed' && !job.completion_report_submitted) return 'needs_report';
    if (job.status === 'in_progress') return 'in_progress';
    if (job.assignment_status === 'pending_confirmation') return 'needs_confirmation';
    if (job.assignment_status === 'accepted' || job.status === 'assigned') return 'confirmed';
    if (job.status === 'finding_interpreter') return 'available';
    return 'pending';
  };

  const jobStatus = getJobStatus();

  // Status configuration
  const statusConfig = {
    available: {
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: 'Available',
      icon: null
    },
    confirmed: {
      color: 'bg-green-100 text-green-800 border-green-300',
      label: 'Confirmed',
      icon: <CheckCircleIcon className="h-4 w-4" />
    },
    needs_confirmation: {
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      label: 'Needs Confirmation',
      icon: <ExclamationTriangleIcon className="h-4 w-4" />
    },
    in_progress: {
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      label: 'In Progress',
      icon: <ClockIcon className="h-4 w-4" />
    },
    needs_report: {
      color: 'bg-red-100 text-red-800 border-red-300',
      label: 'Report Due',
      icon: <ExclamationTriangleIcon className="h-4 w-4" />
    },
    completed: {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: 'Completed',
      icon: <CheckCircleIcon className="h-4 w-4" />
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: 'Pending',
      icon: <ClockIcon className="h-4 w-4" />
    }
  };

  const status = statusConfig[jobStatus] || statusConfig.pending;

  // Progress steps
  const getProgressSteps = () => {
    const steps = [
      { key: 'accepted', label: 'Accepted', completed: job.assignment_status === 'accepted' || job.status === 'assigned' },
      { key: 'confirmed', label: 'Confirmed', completed: job.assignment_status === 'confirmed' || job.confirmed_at },
      { key: 'in_progress', label: 'Started', completed: job.status === 'in_progress' || job.job_started_at },
      { key: 'completed', label: 'Completed', completed: job.completion_report_submitted }
    ];

    const currentIndex = steps.findIndex(step => !step.completed);
    return { steps, currentIndex: currentIndex === -1 ? steps.length : currentIndex };
  };

  const { steps, currentIndex } = getProgressSteps();

  // Get next action
  const getNextAction = () => {
    if (jobStatus === 'needs_report') {
      return {
        label: 'Submit Report',
        onClick: () => {
          if (onShowCompletionReport) {
            onShowCompletionReport(job);
          } else {
            navigate(`/job/${job.id}#completion-report`);
          }
        },
        variant: 'primary',
        urgent: true
      };
    }
    if (jobStatus === 'needs_confirmation') {
      return {
        label: 'Confirm Now',
        onClick: () => navigate(`/job/${job.id}#confirm`),
        variant: 'primary',
        urgent: true
      };
    }
    if (jobStatus === 'in_progress') {
      return {
        label: 'View Details',
        onClick: () => navigate(`/job/${job.id}`),
        variant: 'outline'
      };
    }
    if (jobStatus === 'available') {
      return {
        label: 'View & Accept',
        onClick: () => navigate(`/job/${job.id}`),
        variant: 'primary'
      };
    }
    return {
      label: 'View Details',
      onClick: () => navigate(`/job/${job.id}`),
      variant: 'outline'
    };
  };

  const nextAction = getNextAction();

  const handleCardClick = () => {
    if (onClick) {
      onClick(job);
    } else {
      navigate(`/job/${job.id}`);
    }
  };

  // Time until job
  const getTimeUntilJob = () => {
    // Validate required fields
    if (!job.scheduled_date || !job.scheduled_time) {
      return null;
    }
    
    const now = new Date();
    // Extract just the date part from scheduled_date (in case it's a full ISO timestamp)
    const dateOnly = job.scheduled_date.split('T')[0];
    const jobDate = new Date(`${dateOnly}T${job.scheduled_time}`);
    
    // Check if date is valid
    if (isNaN(jobDate.getTime())) {
      return null;
    }
    
    const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) return null;
    if (hoursUntil < 1) return `in ${Math.round(hoursUntil * 60)} minutes`;
    if (hoursUntil < 24) return `in ${Math.round(hoursUntil)} hours`;
    const daysUntil = Math.floor(hoursUntil / 24);
    return `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`;
  };

  const timeUntil = getTimeUntilJob();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border-2 hover:border-blue-500 cursor-pointer transition-all shadow-sm hover:shadow-md ${
        variant === 'compact' ? 'p-4' : 'p-5'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
            
            {/* Remote Badge */}
            {job.is_remote && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                <GlobeAltIcon className="h-3 w-3" />
                Remote
              </span>
            )}

            {/* Time Until Badge */}
            {timeUntil && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {timeUntil}
              </span>
            )}
          </div>
          
          {/* Job Number/Title */}
          <h3 className="text-base font-semibold text-gray-900">
            {job.job_number || `Job #${job.id?.substring(0, 8)}`}
          </h3>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        {/* Date & Time */}
        <div className="flex items-center text-sm text-gray-700">
          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{formatDate(job.scheduled_date)}</span>
          <span className="mx-2">•</span>
          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span>{formatTime(job.scheduled_time)}</span>
          {job.estimated_duration_minutes && (
            <span className="text-gray-500 ml-1">({job.estimated_duration_minutes} min)</span>
          )}
        </div>

        {/* Location */}
        {!job.is_remote && job.location_city && (
          <div className="flex items-start text-sm text-gray-700">
            <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">{job.location_city}, {job.location_state}</span>
          </div>
        )}

        {/* Distance */}
        {!job.is_remote && job.distance_miles !== null && job.distance_miles !== undefined && (
          <div className="flex items-center text-sm text-blue-600">
            <ArrowPathIcon className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
            <span className="font-medium">{job.distance_miles.toFixed(1)} miles away</span>
          </div>
        )}

        {/* Language & Service */}
        <div className="flex items-center text-sm text-gray-700">
          <span className="font-medium">{job.language_name || job.source_language_name}</span>
          {job.target_language_name && job.target_language_name !== 'English' && (
            <span className="mx-1">→ {job.target_language_name}</span>
          )}
          <span className="mx-2">•</span>
          <span>{job.service_type_name}</span>
        </div>

        {/* Earnings (if available) */}
        {job.agreed_rate && (
          <div className="flex items-center text-sm font-medium text-green-600">
            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
            {formatCurrency(job.agreed_rate * (job.estimated_duration_minutes / 60))}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && variant !== 'compact' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.key} className="flex-1">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    step.completed 
                      ? 'bg-blue-600 border-blue-600' 
                      : index === currentIndex
                      ? 'bg-white border-blue-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    {step.completed && (
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${
                      step.completed ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
                <div className={`text-xs mt-1 ${
                  step.completed ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Action Required */}
      {nextAction.urgent && (
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center text-orange-800 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="font-medium">Action required</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={nextAction.onClick}
            variant={nextAction.variant}
            size="sm"
            className="flex-1"
          >
            {nextAction.label}
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default JobCard;

