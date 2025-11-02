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
        const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
        const isNotPending = !(job.assignment_status === 'available' && job.status === 'finding_interpreter');
        return isNotCompleted && isNotPending;
      }).sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });
    } else if (activeTab === 'completion_reports') {
      return jobs.filter(job => 
        job.status === 'completed' && !job.completion_report_submitted
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
      const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
      const isNotPending = !(job.assignment_status === 'available' && job.status === 'finding_interpreter');
      return isNotCompleted && isNotPending;
    }).length;

    const completionReportsCount = jobs.filter(job => 
      job.status === 'completed' && !job.completion_report_submitted
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
                            {formatCurrency(earnings.summary?.total_earnings || 0)}
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
                            {earnings.summary?.completed_jobs || earnings.breakdown?.length || 0}
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
                            {parseFloat(earnings.summary?.total_hours || 0).toFixed(1)}
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
                            {formatCurrency(earnings.summary?.average_per_job || 0)}
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-12 w-12 text-orange-600 opacity-50" />
                      </div>
                    </div>
                  </div>

                  {/* Earnings Breakdown - All Completed Jobs */}
                  {earnings.breakdown && earnings.breakdown.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Completed Jobs ({earnings.breakdown.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          {earnings.breakdown.map((item) => {
                            // For jobs marked as paid, use interpreter_paid_amount; otherwise use calculated earnings
                            const displayAmount = (item.status === 'interpreter_paid' && item.interpreter_paid_amount) 
                              ? item.interpreter_paid_amount 
                              : (item.earnings || 0);
                            
                            return (
                              <div
                                key={item.id || item.job_number}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-all"
                                onClick={() => navigate(`/job/${item.id}`)}
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.job_number || item.title || `Job #${item.id}`}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {item.scheduled_date ? formatDate(item.scheduled_date) : 'N/A'}
                                  </p>
                                  {item.status === 'interpreter_paid' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300 mt-1">
                                      Paid
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <p className={`text-lg font-semibold ${item.status === 'interpreter_paid' && item.interpreter_paid_amount ? 'text-green-600' : 'text-gray-700'}`}>
                                      {formatCurrency(displayAmount)}
                                    </p>
                                  </div>
                                  {item.status === 'interpreter_paid' && item.interpreter_paid_amount && (
                                    <p className="text-xs text-green-600 font-medium mt-1">Actual Payment</p>
                                  )}
                                  <p className="text-sm text-gray-500 mt-1">{item.calculated_hours || 0} hrs</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state when no breakdown */}
                  {earnings.breakdown && earnings.breakdown.length === 0 && (
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

