import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  PlayIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import jobAPI from '../services/jobAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import JobCard from '../components/JobCard';
import InterpreterCompletionReport from '../components/InterpreterCompletionReport';
import { isToday } from '../utils/dateUtils';

const DashboardNew = () => {
  const navigate = useNavigate();
  const { user, profile, makeAuthenticatedRequest } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState({ thisMonth: 0, total: 0, hours: 0 });
  const [loading, setLoading] = useState(true);
  const [showCompletionReport, setShowCompletionReport] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
      loadDashboardData();
    
    // Reload every minute to update countdowns
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [jobsRes, earningsRes] = await Promise.all([
        jobAPI.getMyJobs({ limit: 100 }),
        jobAPI.getEarnings({ period: 'month' })
      ]);

      setJobs(jobsRes.data.data.jobs);
      if (earningsRes.data.success) {
        setEarnings({
          thisMonth: parseFloat(earningsRes.data.data.summary.total_earnings || 0),
          total: parseFloat(earningsRes.data.data.summary.total_earnings || 0),
          hours: parseFloat(earningsRes.data.data.summary.total_hours || 0)
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate critical items
  const getCriticalItems = () => {
    const now = new Date();

    // Overdue completion reports (>24 hours)
    const overdueReports = jobs.filter(job => {
      if (job.status !== 'completed' || job.completion_report_submitted) return false;
      if (!job.completed_at) return false;
      const completedTime = new Date(job.completed_at);
      const hoursSince = (now - completedTime) / (1000 * 60 * 60);
      return hoursSince > 24;
    });

    // Jobs needing confirmation (within 48 hours)
    const needsConfirmation = jobs.filter(job => {
      if (job.assignment_status !== 'pending_confirmation') return false;
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 48;
    });

    // Jobs starting very soon without confirmation (<2 hours)
    const startingSoon = jobs.filter(job => {
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil < 2 && !job.confirmed_at;
    });

    return {
      overdueReports,
      needsConfirmation,
      startingSoon,
      total: overdueReports.length + needsConfirmation.length + startingSoon.length
    };
  };

  // Get smart action (what interpreter should do RIGHT NOW)
  const getSmartAction = () => {
    const now = new Date();

    // Priority 1: Job starting in 30 minutes
    const upcomingJob = jobs.find(job => {
      if (job.status !== 'assigned' && job.status !== 'confirmed') return false;
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const minutesUntil = (jobDate - now) / 60000;
      return minutesUntil > 0 && minutesUntil <= 30;
    });

    if (upcomingJob) {
      return {
        type: 'start_job',
        job: upcomingJob,
        urgency: 'critical'
      };
    }

    // Priority 2: Job currently in progress
    const inProgressJob = jobs.find(job => job.status === 'in_progress');
    if (inProgressJob) {
      return {
        type: 'job_in_progress',
        job: inProgressJob,
        urgency: 'high'
      };
    }

    // Priority 3: Overdue completion report
    const overdueReport = jobs.find(job => {
      if (job.status !== 'completed' || job.completion_report_submitted) return false;
      if (!job.completed_at) return false;
      const completedTime = new Date(job.completed_at);
      const hoursSince = (now - completedTime) / (1000 * 60 * 60);
      return hoursSince > 24;
    });

    if (overdueReport) {
      return {
        type: 'overdue_report',
        job: overdueReport,
        urgency: 'critical'
      };
    }

    // Priority 4: Completion report due (within 24 hours)
    const reportDue = jobs.find(job => {
      if (job.status !== 'completed' || job.completion_report_submitted) return false;
      if (!job.completed_at) return false;
      const completedTime = new Date(job.completed_at);
      const hoursSince = (now - completedTime) / (1000 * 60 * 60);
      return hoursSince <= 24;
    });

    if (reportDue) {
      return {
        type: 'report_due',
        job: reportDue,
        urgency: 'high'
      };
    }

    // Priority 5: Confirmation needed
    const needsConfirm = jobs.find(job => {
      if (job.assignment_status !== 'pending_confirmation') return false;
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 48;
    });

    if (needsConfirm) {
      return {
        type: 'needs_confirmation',
        job: needsConfirm,
        urgency: 'medium'
      };
    }

    // Default: Find new jobs
    return {
      type: 'find_jobs',
      urgency: 'low'
    };
  };

  // Get today's jobs
  const getTodaysJobs = () => {
    return jobs.filter(job => {
      const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
      const jobIsToday = isToday(job.scheduled_date);
      return isNotCompleted && jobIsToday;
    }).sort((a, b) => {
      const timeA = a.scheduled_time || '00:00';
      const timeB = b.scheduled_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const criticalItems = getCriticalItems();
  const smartAction = getSmartAction();
  const todaysJobs = getTodaysJobs();
  const upcomingJobs = jobs.filter(job => {
    const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
    const isFuture = new Date(job.scheduled_date) > new Date();
    return isNotCompleted && isFuture;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Smart Action Card Component
  const SmartActionCard = () => {
    const getCountdown = (job) => {
      if (!job || !job.scheduled_date || !job.scheduled_time) return '';
      
      const now = new Date();
      const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      const minutesUntil = Math.floor((jobDate - now) / 60000);
      
      if (minutesUntil < 60) {
        return `${minutesUntil} minutes`;
      }
      return `${Math.floor(minutesUntil / 60)} hours`;
    };

    const actionConfigs = {
      start_job: {
        title: 'Job Starting Soon!',
        subtitle: smartAction.job ? `Starts in ${getCountdown(smartAction.job)}` : '',
        icon: <PlayIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-green-600 to-green-700',
        buttonText: 'START JOB NOW',
        buttonAction: () => smartAction.job && navigate(`/job/${smartAction.job.id}#start`)
      },
      job_in_progress: {
        title: 'Job In Progress',
        subtitle: 'Complete when finished',
        icon: <ClockIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-purple-600 to-purple-700',
        buttonText: 'View Job',
        buttonAction: () => smartAction.job && navigate(`/job/${smartAction.job.id}`)
      },
      overdue_report: {
        title: 'Completion Report Overdue!',
        subtitle: 'Submit immediately to avoid penalties',
        icon: <ExclamationTriangleIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-red-600 to-red-700',
        buttonText: 'SUBMIT REPORT NOW',
        buttonAction: () => smartAction.job && navigate(`/job/${smartAction.job.id}#completion-report`)
      },
      report_due: {
        title: 'Completion Report Due',
        subtitle: 'Submit within 24 hours of job completion',
        icon: <DocumentTextIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-orange-600 to-orange-700',
        buttonText: 'Submit Report',
        buttonAction: () => smartAction.job && navigate(`/job/${smartAction.job.id}#completion-report`)
      },
      needs_confirmation: {
        title: 'Confirmation Required',
        subtitle: 'Confirm your attendance',
        icon: <CheckCircleIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-yellow-600 to-yellow-700',
        buttonText: 'Confirm Now',
        buttonAction: () => smartAction.job && navigate(`/job/${smartAction.job.id}#confirm`)
      },
      find_jobs: {
        title: 'All Caught Up!',
        subtitle: 'Find new opportunities',
        icon: <MagnifyingGlassIcon className="h-12 w-12 text-white" />,
        bgColor: 'bg-gradient-to-r from-blue-600 to-blue-700',
        buttonText: 'Find New Jobs',
        buttonAction: () => navigate('/jobs/search')
      }
    };

    const config = actionConfigs[smartAction.type];

  return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${config.bgColor} rounded-xl shadow-xl p-8 text-white`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              {config.icon}
              <div className="ml-4">
                <h2 className="text-3xl font-bold">{config.title}</h2>
                <p className="text-lg text-white/90 mt-1">{config.subtitle}</p>
              </div>
            </div>

            {smartAction.job && (
              <div className="mt-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm font-medium mb-2">Job Details:</div>
                <div className="text-sm space-y-1">
                  <div>{smartAction.job.job_number}</div>
                  <div>{smartAction.job.language_name} • {smartAction.job.service_type_name}</div>
                  {!smartAction.job.is_remote && (
                    <div>
                      {smartAction.job.location_address || 
                        (smartAction.job.location_city && smartAction.job.location_state 
                          ? `${smartAction.job.location_city}, ${smartAction.job.location_state}` 
                          : 'Location TBD')}
                    </div>
                  )}
          </div>
            </div>
            )}
          </div>
      </div>

        <div className="mt-6">
          <Button
            onClick={config.buttonAction}
            variant="inverse"
            size="xl"
            className="font-bold shadow-lg"
          >
            {config.buttonText}
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </Button>
      </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || user?.first_name || 'there'}!
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Critical Alerts */}
        {criticalItems.total > 0 && (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
              <div className="flex items-start">
                <BellIcon className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-red-900">
                    {criticalItems.total} Action{criticalItems.total !== 1 ? 's' : ''} Required
                  </h3>
                  <div className="mt-2 text-sm text-red-800 space-y-1">
                    {criticalItems.overdueReports.length > 0 && (
                      <div>• {criticalItems.overdueReports.length} overdue completion report{criticalItems.overdueReports.length !== 1 ? 's' : ''}</div>
                    )}
                    {criticalItems.needsConfirmation.length > 0 && (
                      <div>• {criticalItems.needsConfirmation.length} job{criticalItems.needsConfirmation.length !== 1 ? 's' : ''} needing confirmation</div>
                    )}
                    {criticalItems.startingSoon.length > 0 && (
                      <div>• {criticalItems.startingSoon.length} job{criticalItems.startingSoon.length !== 1 ? 's' : ''} starting soon</div>
                    )}
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={() => navigate('/pending')}
                      size="sm"
                      variant="outline-danger"
                    >
                      View All Pending Actions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
        </motion.div>
      )}

        {/* Smart Action Card */}
        <SmartActionCard />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Jobs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{upcomingJobs}</p>
              </div>
              <CalendarDaysIcon className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{earnings.hours.toFixed(1)}</p>
              </div>
              <ClockIcon className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month Earnings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${earnings.thisMonth.toFixed(0)}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Today's Schedule</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/schedule')}>
              View Full Schedule
            </Button>
          </div>
          
          {todaysJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysJobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  variant="default"
                  onShowCompletionReport={(job) => {
                    setSelectedJob(job);
                    setShowCompletionReport(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs today</h3>
              <p className="mt-1 text-sm text-gray-500">Check out available opportunities</p>
              <div className="mt-6">
                <Button onClick={() => navigate('/jobs/search')}>
                  Find Jobs
                </Button>
              </div>
            </div>
          )}
        </div>
          </div>

        {/* Completion Report Modal */}
        {showCompletionReport && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <InterpreterCompletionReport
                jobId={selectedJob.id}
                jobData={selectedJob}
                onSubmit={() => {
                  setShowCompletionReport(false);
                  setSelectedJob(null);
                  loadDashboardData();
                }}
                onCancel={() => {
                  setShowCompletionReport(false);
                  setSelectedJob(null);
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default DashboardNew;

