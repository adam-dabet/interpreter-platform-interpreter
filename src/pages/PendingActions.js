import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  CalendarIcon,
  MapPinIcon,
  BellIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const PendingActions = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getMyJobs({ limit: 100 });
      setJobs(response.data.data.jobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load pending actions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pending actions
  const getPendingActions = () => {
    const now = new Date();
    
    // Overdue completion reports (>24 hours after job completion)
    const overdueReports = jobs.filter(job => {
      if (job.status !== 'completed' || job.completion_report_submitted) return false;
      if (!job.completed_at) return false;
      
      const completedTime = new Date(job.completed_at);
      const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);
      return hoursSinceCompletion > 24;
    });

    // Completion reports due (job completed, <24 hours)
    const reportsDue = jobs.filter(job => {
      if (job.status !== 'completed' || job.completion_report_submitted) return false;
      if (!job.completed_at) return false;
      
      const completedTime = new Date(job.completed_at);
      const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);
      return hoursSinceCompletion <= 24;
    });

    // Jobs needing confirmation (2-day window)
    const needsConfirmation = jobs.filter(job => {
      if (job.assignment_status !== 'pending_confirmation') return false;
      
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntilJob = (jobDate - now) / (1000 * 60 * 60);
      
      // Show if job is within 48 hours
      return hoursUntilJob > 0 && hoursUntilJob <= 48;
    });

    // Jobs needing confirmation soon (3-7 days)
    const upcomingConfirmations = jobs.filter(job => {
      if (job.assignment_status !== 'accepted') return false;
      
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntilJob = (jobDate - now) / (1000 * 60 * 60);
      
      // Show if job is 3-7 days away (will need confirmation in 2 days)
      return hoursUntilJob > 48 && hoursUntilJob <= 168; // 48hrs to 7days
    });

    return {
      overdueReports,
      reportsDue,
      needsConfirmation,
      upcomingConfirmations
    };
  };

  const pendingActions = getPendingActions();
  const totalPending = pendingActions.overdueReports.length + 
                      pendingActions.reportsDue.length + 
                      pendingActions.needsConfirmation.length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getTimeUntilJob = (job) => {
    const now = new Date();
    const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
    const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 24) {
      return `in ${Math.round(hoursUntil)} hours`;
    } else {
      const daysUntil = Math.floor(hoursUntil / 24);
      return `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`;
    }
  };

  const getTimeSinceCompletion = (job) => {
    if (!job.completed_at) return '';
    
    const now = new Date();
    const completedTime = new Date(job.completed_at);
    const hoursSince = (now - completedTime) / (1000 * 60 * 60);
    
    if (hoursSince < 24) {
      return `${Math.round(hoursSince)} hours ago`;
    } else {
      const daysSince = Math.floor(hoursSince / 24);
      return `${daysSince} ${daysSince === 1 ? 'day' : 'days'} ago`;
    }
  };

  const ActionCard = ({ job, actionType, urgency }) => {
    let icon, title, description, actionText, buttonVariant;
    
    switch (actionType) {
      case 'overdue_report':
        icon = <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
        title = 'Overdue Completion Report';
        description = `Job completed ${getTimeSinceCompletion(job)}`;
        actionText = 'Submit Report Now';
        buttonVariant = 'danger';
        break;
      case 'report_due':
        icon = <DocumentTextIcon className="h-6 w-6 text-orange-600" />;
        title = 'Completion Report Due';
        description = `Job completed ${getTimeSinceCompletion(job)}`;
        actionText = 'Submit Report';
        buttonVariant = 'orange';
        break;
      case 'needs_confirmation':
        icon = <CheckCircleIcon className="h-6 w-6 text-yellow-600" />;
        title = 'Confirmation Required';
        description = `Job starts ${getTimeUntilJob(job)}`;
        actionText = 'Confirm Attendance';
        buttonVariant = 'warning';
        break;
      case 'upcoming_confirmation':
        icon = <CalendarIcon className="h-6 w-6 text-blue-600" />;
        title = 'Upcoming Job';
        description = `Job starts ${getTimeUntilJob(job)}`;
        actionText = 'View Details';
        buttonVariant = 'primary';
        break;
      default:
        icon = <BellIcon className="h-6 w-6 text-gray-600" />;
        title = 'Action Required';
        description = '';
        actionText = 'View';
        buttonVariant = 'secondary';
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg border-2 p-5 ${
          urgency === 'overdue' 
            ? 'border-red-300 bg-red-50' 
            : urgency === 'due_soon' 
            ? 'border-orange-300 bg-orange-50' 
            : 'border-blue-300 bg-blue-50'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {description}
              </p>
              
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <span className="font-medium">Job:</span>
                  <span className="ml-2">{job.job_number || `#${job.id.substring(0, 8)}`}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(job.scheduled_date)} at {formatTime(job.scheduled_time)}
                </div>
                {!job.is_remote && (
                  <div className="flex items-start">
                    <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {job.location_address || 
                        (job.location_city && job.location_state 
                          ? `${job.location_city}, ${job.location_state}` 
                          : 'Location TBD')}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <span>{job.language_name} • {job.service_type_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-end">
          <Button
            onClick={() => navigate(`/job/${job.id}`)}
            variant={buttonVariant}
          >
            {actionText}
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pending Actions</h1>
          <p className="mt-2 text-gray-600">
            {totalPending > 0 
              ? `You have ${totalPending} ${totalPending === 1 ? 'action' : 'actions'} that need your attention`
              : 'You\'re all caught up! 🎉'}
          </p>
        </div>

        {/* All Caught Up State */}
        {totalPending === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-green-50 rounded-lg border-2 border-green-200"
          >
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600 mb-6">
              You have no pending actions. Great job staying on top of things!
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={() => navigate('/schedule')}>
                View Schedule
              </Button>
              <Button variant="outline" onClick={() => navigate('/jobs/search')}>
                Find New Jobs
              </Button>
            </div>
          </motion.div>
        )}

        {/* Overdue Section */}
        {pendingActions.overdueReports.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-2xl font-bold text-red-900">
                Overdue ({pendingActions.overdueReports.length})
              </h2>
            </div>
            <p className="text-sm text-red-700 mb-4">
              These items are overdue and require immediate attention
            </p>
            <div className="grid grid-cols-1 gap-4">
              {pendingActions.overdueReports.map(job => (
                <ActionCard 
                  key={job.id} 
                  job={job} 
                  actionType="overdue_report" 
                  urgency="overdue"
                />
              ))}
            </div>
          </div>
        )}

        {/* Due Soon Section */}
        {(pendingActions.reportsDue.length > 0 || pendingActions.needsConfirmation.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <ClockIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h2 className="text-2xl font-bold text-orange-900">
                Due Soon ({pendingActions.reportsDue.length + pendingActions.needsConfirmation.length})
              </h2>
            </div>
            <p className="text-sm text-orange-700 mb-4">
              These items need your attention soon
            </p>
            <div className="grid grid-cols-1 gap-4">
              {pendingActions.reportsDue.map(job => (
                <ActionCard 
                  key={job.id} 
                  job={job} 
                  actionType="report_due" 
                  urgency="due_soon"
                />
              ))}
              {pendingActions.needsConfirmation.map(job => (
                <ActionCard 
                  key={job.id} 
                  job={job} 
                  actionType="needs_confirmation" 
                  urgency="due_soon"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {pendingActions.upcomingConfirmations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-bold text-blue-900">
                Upcoming ({pendingActions.upcomingConfirmations.length})
              </h2>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              These jobs are coming up and will need confirmation soon
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingActions.upcomingConfirmations.map(job => (
                <ActionCard 
                  key={job.id} 
                  job={job} 
                  actionType="upcoming_confirmation" 
                  urgency="upcoming"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingActions;

