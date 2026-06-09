import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { formatDate as formatDateUtil, formatTime as formatTimeUtil, parseLocalDate, getJobScheduledDateTime, isToday as isTodayDate, isTomorrow as isTomorrowDate } from '../utils/dateUtils';
import { jobNeedsAvailabilityConfirmation } from '../utils/jobConfirmation';

const COMPLETED_JOB_STATUSES = ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid', 'cancelled'];

const MySchedule = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('timeline'); // 'calendar' or 'timeline'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const allJobs = [];

      do {
        const response = await jobAPI.getMyJobs({ page, limit: pageSize });
        const data = response?.data?.data || {};
        const pageJobs = data.jobs || [];
        const pagination = data.pagination || {};

        allJobs.push(...pageJobs);
        totalPages = pagination.total_pages || 1;
        page += 1;
      } while (page <= totalPages);

      setJobs(allJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Active appointments from today onward (excludes completed/cancelled history)
  const upcomingJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (COMPLETED_JOB_STATUSES.includes(job.status)) return false;
        const jobDate = getJobScheduledDateTime(job);
        return jobDate && jobDate >= startOfToday;
      })
      .sort(
        (a, b) =>
          (getJobScheduledDateTime(a)?.getTime() ?? Infinity) -
          (getJobScheduledDateTime(b)?.getTime() ?? Infinity)
      );
  }, [jobs, startOfToday]);

  // Group by local calendar date, sorted chronologically for timeline rendering
  const sortedScheduleGroups = useMemo(() => {
    const grouped = new Map();

    upcomingJobs.forEach((job) => {
      const date = parseLocalDate(job.scheduled_date);
      const dateKey = date ? date.toDateString() : 'Date TBD';
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey).push(job);
    });

    return Array.from(grouped.entries()).sort(([_, jobsA], [__, jobsB]) => {
      const timeA = getJobScheduledDateTime(jobsA[0])?.getTime() ?? Infinity;
      const timeB = getJobScheduledDateTime(jobsB[0])?.getTime() ?? Infinity;
      return timeA - timeB;
    });
  }, [upcomingJobs]);

  const groupedJobs = useMemo(() => {
    const obj = {};
    sortedScheduleGroups.forEach(([dateKey, dateJobs]) => {
      obj[dateKey] = dateJobs;
    });
    return obj;
  }, [sortedScheduleGroups]);

  // Get jobs for a specific date (for calendar view)
  const getJobsForDate = (date) => {
    const dateStr = date.toDateString();
    return groupedJobs[dateStr] || [];
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Use imported date utilities
  const formatDate = (dateString) => {
    return formatDateUtil(dateString, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return formatTimeUtil(timeString);
  };

  const getStatusColor = (job) => {
    if (job.status === 'finding_interpreter') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (jobNeedsAvailabilityConfirmation(job)) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (job.status === 'assigned' || job.assignment_status === 'accepted') return 'bg-green-100 text-green-800 border-green-300';
    if (job.status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusLabel = (job) => {
    if (jobNeedsAvailabilityConfirmation(job)) return 'Needs Confirmation';
    if (job.status === 'finding_interpreter') return 'Available';
    if (job.assignment_status === 'accepted') return 'Confirmed';
    if (job.status === 'in_progress') return 'In Progress';
    return job.status;
  };

  const JobCard = ({ job }) => (
    <div
      className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 cursor-pointer transition-all"
      onClick={() => navigate(`/job/${job.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job)}`}>
              {getStatusLabel(job)}
            </span>
            {job.is_remote && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Remote
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            {job.status === 'finding_interpreter' 
              ? (job.service_type_name || 'Job Opportunity')
              : (job.job_number || `Job #${job.id.substring(0, 8)}`)}
          </h3>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
          {formatTime(job.arrival_time || job.scheduled_time)} - {job.estimated_duration_minutes} min
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
          <span className="text-gray-700 font-medium">{job.language_name}</span>
          <span className="mx-2">•</span>
          <span>{job.service_type_name}</span>
        </div>
      </div>

      {jobNeedsAvailabilityConfirmation(job) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center text-orange-600 text-xs">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            Confirmation required
          </div>
        </div>
      )}
    </div>
  );

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
              <p className="mt-2 text-gray-600">
                {upcomingJobs.length} upcoming {upcomingJobs.length === 1 ? 'appointment' : 'appointments'}
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ViewColumnsIcon className="h-4 w-4" />
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-8">
            {sortedScheduleGroups.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming jobs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check the job board to find new opportunities
                </p>
                <div className="mt-6">
                  <Button onClick={() => navigate('/jobs/search')}>
                    Find Jobs
                  </Button>
                </div>
              </div>
            ) : (
              sortedScheduleGroups.map(([date, dateJobs]) => {
                const isTbd = date === 'Date TBD';
                const isDateToday = !isTbd && isTodayDate(dateJobs[0].scheduled_date);
                const isTomorrow = !isTbd && isTomorrowDate(dateJobs[0].scheduled_date);

                let dateLabel = isTbd ? 'Date TBD' : formatDate(dateJobs[0].scheduled_date);
                if (isDateToday) dateLabel = 'Today';
                if (isTomorrow) dateLabel = 'Tomorrow';

                return (
                  <div key={date}>
                    <h2 className={`text-xl font-bold mb-4 ${isDateToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dateLabel}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({dateJobs.length} {dateJobs.length === 1 ? 'job' : 'jobs'})
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dateJobs.map(job => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayJobs = getJobsForDate(date);
                const hasJobs = dayJobs.length > 0;
                const isCurrentDay = isToday(date);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square p-2 rounded-lg border-2 transition-all hover:border-blue-500 ${
                      isCurrentDay
                        ? 'bg-blue-50 border-blue-500'
                        : hasJobs
                        ? 'bg-green-50 border-green-300'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium">{date.getDate()}</div>
                    {hasJobs && (
                      <div className="mt-1">
                        <div className="w-full h-1 bg-green-500 rounded-full" />
                        <div className="text-xs text-gray-600 mt-1">{dayJobs.length}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Jobs */}
            {selectedDate && getJobsForDate(selectedDate).length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">
                  Jobs on {formatDate(selectedDate.toISOString())}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getJobsForDate(selectedDate).map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySchedule;

