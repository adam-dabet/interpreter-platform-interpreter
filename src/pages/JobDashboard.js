import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import jobAPI from '../services/jobAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import JobCard from '../components/JobCard';
import InterpreterCompletionReport from '../components/InterpreterCompletionReport';
import { formatDate as formatDateUtil, formatCurrency as formatCurrencyUtil } from '../utils/dateUtils';

const COMPLETED_JOB_STATUSES = ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'];

const JobDashboardNew = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [earningsPeriod, setEarningsPeriod] = useState('all');
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [showCompletionReport, setShowCompletionReport] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'earnings') {
      loadEarnings(earningsPeriod);
    }
  }, [activeTab, earningsPeriod]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getMyJobs({ limit: 100 });
      setJobs(response.data.data.jobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async (period = 'month') => {
    try {
      setEarningsLoading(true);
      const response = await jobAPI.getEarnings({ period });
      console.log('Earnings response:', {
        period,
        summary: response.data?.data?.summary,
        breakdownCount: response.data?.data?.breakdown?.length,
        breakdown: response.data?.data?.breakdown
      });
      setEarnings(response.data.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error('Failed to load earnings');
    } finally {
      setEarningsLoading(false);
    }
  };

  // Filter jobs based on active tab
  const getFilteredJobs = () => {
    if (activeTab === 'pending') {
      return jobs.filter(job => 
        job.assignment_status === 'available' && job.status === 'finding_interpreter'
      ).sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });
    } else if (activeTab === 'upcoming') {
      return jobs.filter(job => {
        const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid', 'cancelled'].includes(job.status);
        const isNotPending = !(job.assignment_status === 'available' && job.status === 'finding_interpreter');
        return isNotCompleted && isNotPending;
      }).sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });
    } else if (activeTab === 'completion_reports') {
      // Only show jobs where the interpreter actually accepted the assignment
      return jobs.filter(job => 
        job.status === 'completed' && !job.completion_report_submitted && job.assignment_status === 'accepted'
      ).sort((a, b) => {
        const dateA = new Date(a.completed_at || a.scheduled_date);
        const dateB = new Date(b.completed_at || b.scheduled_date);
        return dateB - dateA; // Most recent first
      });
    } else if (activeTab === 'past') {
      return jobs.filter(job => 
        ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status) ||
        job.completion_report_submitted
      ).sort((a, b) => {
        const dateA = new Date(a.completed_at || a.scheduled_date);
        const dateB = new Date(b.completed_at || b.scheduled_date);
        return dateB - dateA; // Most recent first
      });
    }
    return [];
  };

  // Calculate tab counts using useMemo
  const tabs = useMemo(() => {
    const pendingCount = jobs.filter(job => 
      job.assignment_status === 'available' && job.status === 'finding_interpreter'
    ).length;

    const upcomingCount = jobs.filter(job => {
      const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid', 'cancelled'].includes(job.status);
      const isNotPending = !(job.assignment_status === 'available' && job.status === 'finding_interpreter');
      return isNotCompleted && isNotPending;
    }).length;

    const completionReportsCount = jobs.filter(job => 
      job.status === 'completed' && !job.completion_report_submitted && job.assignment_status === 'accepted'
    ).length;

    const pastJobsCount = jobs.filter(job => 
      ['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status) ||
      job.completion_report_submitted
    ).length;

    return [
      { 
        id: 'pending', 
        name: 'Pending Assignment', 
        count: pendingCount,
        description: 'Jobs waiting for admin to assign you'
      },
      { 
        id: 'upcoming', 
        name: 'Upcoming Jobs', 
        count: upcomingCount,
        description: 'Jobs you\'ve accepted and upcoming appointments'
      },
      { 
        id: 'completion_reports', 
        name: 'Reports Due', 
        count: completionReportsCount,
        description: 'Jobs that need completion reports'
      },
      { 
        id: 'past', 
        name: 'Completed', 
        count: pastJobsCount,
        description: 'Your completed job history'
      },
      { 
        id: 'earnings', 
        name: 'Earnings', 
        count: null,
        description: 'View your earnings and payment history'
      }
    ];
  }, [jobs]);

  // Use imported date utilities
  const formatCurrency = (amount) => {
    return formatCurrencyUtil(amount);
  };

  const formatDate = (dateString) => {
    return formatDateUtil(dateString, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getComparableJobDate = (job) => {
    const dateSource = job?.interpreter_paid_at || job?.completed_at || job?.scheduled_date || job?.accepted_at;
    if (!dateSource) {
      return null;
    }

    const parsedDate = new Date(dateSource);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const isWithinSelectedPeriod = (job, period) => {
    if (period === 'all') {
      return true;
    }

    const jobDate = getComparableJobDate(job);
    if (!jobDate) {
      return false;
    }

    const now = new Date();
    const diffMs = now - jobDate;
    const periodMap = {
      week: 7,
      month: 30,
      '6months': 182,
      year: 365
    };
    const allowedDays = periodMap[period];

    if (!allowedDays) {
      return true;
    }

    return diffMs <= allowedDays * 24 * 60 * 60 * 1000;
  };

  const calculateJobHours = (job) => {
    if (job?.calculated_hours) {
      return parseFloat(job.calculated_hours) || 0;
    }

    if (job?.actual_duration_minutes) {
      return parseFloat(job.actual_duration_minutes) / 60;
    }

    if (job?.estimated_duration_minutes) {
      return parseFloat(job.estimated_duration_minutes) / 60;
    }

    return job?.duration_hours || 0;
  };

  const calculateJobEarnings = (job) => {
    const interpreterPaidAmount = parseFloat(job?.interpreter_paid_amount);
    if (job?.status === 'interpreter_paid' && !Number.isNaN(interpreterPaidAmount)) {
      return interpreterPaidAmount;
    }

    if (!Number.isNaN(interpreterPaidAmount) && interpreterPaidAmount > 0) {
      return interpreterPaidAmount;
    }

    const backendAmount = parseFloat(job?.earnings || job?.total_amount || job?.calculated_earnings);
    if (!Number.isNaN(backendAmount) && backendAmount > 0) {
      return backendAmount;
    }

    // Determine billable minutes: use greater of reserved time or actual time from completion report
    // This matches the admin portal's "actual payment" calculation
    const actualMinutes = job?.actual_duration_minutes || 0;
    const reservedHours = job?.reserved_hours || 0;
    const reservedMinutes = job?.reserved_minutes || 0;
    const reservedTimeMinutes = (reservedHours * 60) + reservedMinutes;
    
    // Use the greater of reserved time or actual time (if completion report submitted)
    // Otherwise use estimated duration for upcoming jobs
    let rawBillableMinutes = 0;
    if (actualMinutes > 0) {
      // Job has completion report - use greater of reserved or actual
      rawBillableMinutes = Math.max(reservedTimeMinutes, actualMinutes);
    } else if (job?.estimated_duration_minutes) {
      // Job not yet completed - use greater of reserved or estimated
      rawBillableMinutes = Math.max(reservedTimeMinutes, job.estimated_duration_minutes);
    }

    if (rawBillableMinutes > 0 && (job?.agreed_rate || job?.hourly_rate)) {
      // Round up to billing increment (default 15 minutes if not set)
      const billingIncrement = job?.interpreter_interval_minutes || 15;
      const billableMinutes = Math.ceil(rawBillableMinutes / billingIncrement) * billingIncrement;
      const hours = billableMinutes / 60;
      const rate = parseFloat(job.agreed_rate || job.hourly_rate) || 0;
      return hours * rate;
    }

    return parseFloat(job?.agreed_rate || job?.hourly_rate || 0) || 0;
  };

  const getJobHoursValue = (job) => {
    const hoursValue = job?.calculated_hours !== undefined
      ? parseFloat(job.calculated_hours)
      : calculateJobHours(job);
    return Number.isNaN(hoursValue) ? 0 : hoursValue;
  };

  const getJobEarningsMeta = (job) => {
    const paidAmount = parseFloat(job?.interpreter_paid_amount);
    const hasPaidAmount = !Number.isNaN(paidAmount);
    const isPaidStatus = job?.status === 'interpreter_paid';
    const treatAsPaid = isPaidStatus && hasPaidAmount;

    let amount = 0;
    if (treatAsPaid) {
      amount = paidAmount;
    } else if (hasPaidAmount && paidAmount > 0) {
      amount = paidAmount;
    } else {
      const earningsValue = parseFloat(job?.earnings);
      if (!Number.isNaN(earningsValue) && earningsValue > 0) {
        amount = earningsValue;
      } else {
        amount = calculateJobEarnings(job);
      }
    }

    return {
      amount: Number.isNaN(amount) ? 0 : amount,
      isPaid: treatAsPaid
    };
  };

  const fallbackEarningsRows = useMemo(() => {
    return jobs
      .filter((job) => COMPLETED_JOB_STATUSES.includes(job.status) || job.completion_report_submitted)
      .filter((job) => isWithinSelectedPeriod(job, earningsPeriod))
      .map((job) => ({
        id: job.id,
        job_number: job.job_number,
        title: job.title,
        scheduled_date: job.scheduled_date,
        completed_at: job.completed_at,
        interpreter_paid_at: job.interpreter_paid_at,
        status: job.status,
        interpreter_paid_amount: job.interpreter_paid_amount,
        calculated_hours: calculateJobHours(job),
        earnings: calculateJobEarnings(job),
        isFallback: true
      }));
  }, [jobs, earningsPeriod]);

  const earningsBreakdownRows = useMemo(() => {
    if (earnings?.breakdown?.length) {
      return earnings.breakdown;
    }
    return fallbackEarningsRows;
  }, [earnings, fallbackEarningsRows]);

  const aggregatedRowTotals = useMemo(() => {
    return earningsBreakdownRows.reduce(
      (acc, row) => {
        const { amount } = getJobEarningsMeta(row);
        const hours = getJobHoursValue(row);
        return {
          amount: acc.amount + amount,
          hours: acc.hours + hours
        };
      },
      { amount: 0, hours: 0 }
    );
  }, [earningsBreakdownRows]);

  const derivedSummary = useMemo(() => {
    const fallbackCompletedJobs = earningsBreakdownRows.length;
    const fallbackTotalEarnings = aggregatedRowTotals.amount;
    const fallbackTotalHours = aggregatedRowTotals.hours;
    const fallbackAverage = fallbackCompletedJobs > 0 ? fallbackTotalEarnings / fallbackCompletedJobs : 0;

    const totalEarningsFromApi = parseFloat(earnings?.summary?.total_earnings);
    const totalHoursFromApi = parseFloat(earnings?.summary?.total_hours);
    const averageFromApi = parseFloat(earnings?.summary?.average_per_job);
    const completedJobsFromApi = earnings?.summary?.completed_jobs;

    return {
      totalEarnings: !Number.isNaN(totalEarningsFromApi) && totalEarningsFromApi > 0
        ? totalEarningsFromApi
        : fallbackTotalEarnings,
      completedJobs: completedJobsFromApi || fallbackCompletedJobs,
      totalHours: !Number.isNaN(totalHoursFromApi) && totalHoursFromApi > 0
        ? totalHoursFromApi
        : fallbackTotalHours,
      averagePerJob: !Number.isNaN(averageFromApi) && averageFromApi > 0
        ? averageFromApi
        : fallbackAverage
    };
  }, [aggregatedRowTotals, earnings, earningsBreakdownRows]);

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'interpreter_paid':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'billed':
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'completion_report':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) {
      return 'Unknown';
    }

    switch (status) {
      case 'interpreter_paid':
        return 'Paid';
      case 'billed':
        return 'Billed';
      case 'closed':
        return 'Closed';
      case 'completion_report':
        return 'Report Submitted';
      case 'completed':
        return 'Completed';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const filteredJobs = getFilteredJobs();

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
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <p className="mt-2 text-gray-600">Manage your interpretation assignments</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && (
                    <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          {/* Tab description */}
          <p className="mt-2 text-sm text-gray-500">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        {/* Content */}
        {activeTab === 'earnings' ? (
          // Earnings Tab
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
              <div className="flex gap-2 mb-6 overflow-x-auto">
                {[
                  { id: 'all', name: 'All Time' },
                  { id: 'week', name: 'Last Week' },
                  { id: 'month', name: 'Last Month' },
                  { id: '6months', name: 'Last 6 Months' },
                  { id: 'year', name: 'Last Year' }
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setEarningsPeriod(period.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                      earningsPeriod === period.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period.name}
                  </button>
                ))}
              </div>

              {earningsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : earnings ? (
                <>
                  {/* Earnings Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-900">Total Earnings</p>
                          <p className="text-3xl font-bold text-green-700 mt-2">
                            {formatCurrency(derivedSummary.totalEarnings || 0)}
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-12 w-12 text-green-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Jobs Completed</p>
                          <p className="text-3xl font-bold text-blue-700 mt-2">
                            {derivedSummary.completedJobs || 0}
                          </p>
                        </div>
                        <CheckCircleIcon className="h-12 w-12 text-blue-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-900">Total Hours</p>
                          <p className="text-3xl font-bold text-purple-700 mt-2">
                            {parseFloat(derivedSummary.totalHours || 0).toFixed(1)}
                          </p>
                        </div>
                        <ClockIcon className="h-12 w-12 text-purple-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-900">Avg Per Job</p>
                          <p className="text-3xl font-bold text-orange-700 mt-2">
                            {formatCurrency(derivedSummary.averagePerJob || 0)}
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-12 w-12 text-orange-600 opacity-50" />
                      </div>
                    </div>
                  </div>

                  {/* Earnings Breakdown - All Completed Jobs */}
                  {earningsBreakdownRows.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Completed Jobs ({earningsBreakdownRows.length})
                      </h4>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                          <span className="col-span-4">Job</span>
                          <span className="col-span-3">Date</span>
                          <span className="col-span-2 text-center">Hours</span>
                          <span className="col-span-3 text-right">Earnings</span>
                        </div>
                        <div>
                          {earningsBreakdownRows.map((item) => {
                            const { amount: displayAmount, isPaid } = getJobEarningsMeta(item);
                            const hoursValue = getJobHoursValue(item);
                            const dateToShow = item.interpreter_paid_at || item.completed_at || item.scheduled_date;

                            return (
                              <button
                                type="button"
                                key={item.id || item.job_number}
                                className="w-full border-t border-gray-100 hover:bg-blue-50 transition-colors px-4 py-4 md:px-6 md:py-5 text-left"
                                onClick={() => item.id && navigate(`/job/${item.id}`)}
                              >
                                <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-center md:gap-4">
                                  <div className="col-span-4">
                                    <p className="font-semibold text-gray-900">
                                      {item.job_number || item.title || `Job #${item.id}`}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(item.status)}`}>
                                        {getStatusLabel(item.status)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-sm text-gray-600">
                                      {dateToShow ? formatDate(dateToShow) : 'Date TBD'}
                                    </p>
                                  </div>
                                  <div className="col-span-2 text-sm text-gray-600 md:text-center">
                                    {hoursValue ? `${parseFloat(hoursValue).toFixed(1)} hrs` : '—'}
                                  </div>
                                  <div className="col-span-3 flex flex-col items-start md:items-end">
                                    <p className={`text-lg font-semibold ${isPaid ? 'text-green-600' : 'text-gray-900'}`}>
                                      {formatCurrency(displayAmount)}
                                    </p>
                                    {isPaid && (
                                      <span className="text-xs text-green-600 font-medium">
                                        Actual Payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state when no breakdown */}
                  {earningsBreakdownRows.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">No completed jobs found for this period.</p>
                      <p className="text-xs text-gray-500 mt-2">Try selecting "All Time" to see all completed jobs.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <CurrencyDollarIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Earnings Yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Complete jobs to start earning and see your payment history
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Jobs List (Upcoming, Reports Due, Completed)
          <div>
            {filteredJobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                {activeTab === 'upcoming' && (
                  <>
                    <CalendarIcon className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Upcoming Jobs</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      You don't have any upcoming jobs at the moment
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/jobs/search')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Find Jobs
                      </button>
                    </div>
                  </>
                )}

                {activeTab === 'completion_reports' && (
                  <>
                    <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Reports Due</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      All your completion reports are up to date!
                    </p>
                  </>
                )}

                {activeTab === 'past' && (
                  <>
                    <CheckCircleIcon className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Completed Jobs</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Your completed jobs will appear here
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id} 
                      job={job}
                      showActions={activeTab !== 'past'}
                      showProgress={activeTab === 'upcoming'}
                      onClick={(j) => {
                        if (activeTab === 'completion_reports') {
                          setSelectedJob(j);
                          setShowCompletionReport(true);
                        } else {
                          navigate(`/job/${j.id}`);
                        }
                      }}
                      onShowCompletionReport={(job) => {
                        setSelectedJob(job);
                        setShowCompletionReport(true);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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
                  loadJobs();
                  toast.success('Completion report submitted successfully!');
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
    </div>
  );
};

export default JobDashboardNew;

