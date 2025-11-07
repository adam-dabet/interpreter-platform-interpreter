import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { formatDate as formatDateUtil, formatTime as formatTimeUtil, isToday, isTomorrow } from '../utils/dateUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, makeAuthenticatedRequest } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: {
      upcomingAssignments: 0,
      hoursThisMonth: 0,
      earningsThisMonth: 0,
      completionRate: 0,
      totalEarnings: 0,
      averageRating: 0,
      totalJobs: 0
    },
    upcomingJobs: [],
    recentActivity: [],
    earnings: {
      thisWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
      total: 0
    },
    performance: {
      jobsCompleted: 0,
      onTimeRate: 0,
      customerRating: 0,
      responseTime: 0
    },
    alerts: [],
    quickStats: {
      todayJobs: 0,
      tomorrowJobs: 0,
      pendingApplications: 0,
      profileCompleteness: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isLoading && !isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (isAuthenticated()) {
      loadDashboardData();
    }
  }, [navigate, isLoading, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the same API calls as JobDashboard
      const [
        myJobsResponse,
        availableJobsResponse,
        earningsResponse
      ] = await Promise.allSettled([
        makeAuthenticatedRequest('/jobs/my-jobs?limit=100', 'GET'),
        makeAuthenticatedRequest('/jobs/available', 'GET'),
        makeAuthenticatedRequest('/jobs/earnings?period=month', 'GET')
      ]);

      // Process my jobs using the same logic as JobDashboard
      let upcomingJobs = [];
      let recentActivity = [];
      let stats = {
        upcomingAssignments: 0,
        availableJobs: 0,
        hoursThisMonth: 0,
        earningsThisMonth: 0,
        completionRate: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalJobs: 0
      };

      if (myJobsResponse.status === 'fulfilled' && myJobsResponse.value.ok) {
        const responseData = await myJobsResponse.value.json();
        if (responseData.success) {
          const jobs = responseData.data.jobs || [];
          
          // Use the EXACT same filtering logic as JobDashboard for upcoming jobs
          upcomingJobs = jobs.filter(job => {
            // Show jobs that are finding_interpreter (available to accept) or assigned/in_progress
            const isAvailable = job.status === 'finding_interpreter';
            const isAssigned = job.status === 'assigned' || job.status === 'in_progress';
            const isNotCompleted = !['completed', 'completion_report', 'billed', 'closed', 'interpreter_paid'].includes(job.status);
            
            const shouldShow = (isAvailable || isAssigned) && isNotCompleted;
            return shouldShow;
          }).slice(0, 5);
          
          recentActivity = jobs.slice(0, 10);
          stats.upcomingAssignments = upcomingJobs.length;
          stats.totalJobs = jobs.length;
          
          console.log(`Dashboard: Found ${upcomingJobs.length} upcoming jobs out of ${jobs.length} total jobs`);
        }
      }

      // Process available jobs
      if (availableJobsResponse.status === 'fulfilled' && availableJobsResponse.value.ok) {
        const responseData = await availableJobsResponse.value.json();
        if (responseData.success) {
          stats.availableJobs = responseData.data.jobs?.length || 0;
        }
      }

      // Process earnings
      let earnings = { thisWeek: 0, thisMonth: 0, lastMonth: 0, total: 0 };
      if (earningsResponse.status === 'fulfilled' && earningsResponse.value.ok) {
        const responseData = await earningsResponse.value.json();
        if (responseData.success) {
          const earningsData = responseData.data.summary;
          earnings.thisMonth = parseFloat(earningsData?.total_earnings || 0);
          earnings.total = earnings.thisMonth;
          stats.hoursThisMonth = parseFloat(earningsData?.total_hours || 0);
        }
      }

      // Calculate profile completeness
      const profileCompleteness = calculateProfileCompleteness(profile);

      // Generate alerts
      const alerts = generateAlerts(upcomingJobs, profile, earnings);

      setDashboardData({
        stats,
        upcomingJobs,
        recentActivity,
        earnings,
        performance: {
          jobsCompleted: stats.totalJobs,
          responseTime: 0
        },
        alerts,
        quickStats: {
          todayJobs: upcomingJobs.filter(job => isToday(job.scheduled_date)).length,
          tomorrowJobs: upcomingJobs.filter(job => isTomorrow(job.scheduled_date)).length,
          pendingApplications: 0,
          profileCompleteness
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (profile) => {
    if (!profile) return 0;
    
    let completeness = 0;
    const fields = [
      'first_name', 'last_name', 'email', 'phone', 'address', 
      'city', 'state', 'zip_code', 'languages', 'service_types'
    ];
    
    fields.forEach(field => {
      if (profile[field] && profile[field] !== '') {
        completeness += 1;
      }
    });
    
    return Math.round((completeness / fields.length) * 100);
  };

  const generateAlerts = (upcomingJobs, profile, earnings) => {
    const alerts = [];
    
    // Check for jobs starting soon
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    upcomingJobs.forEach(job => {
      const jobTime = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
      if (jobTime <= oneHourFromNow && jobTime >= now) {
        alerts.push({
          type: 'warning',
          message: `Job starting soon: ${job.title || 'Interpretation Service'} at ${formatTime(job.scheduled_time)}`,
          action: 'View Details',
          href: `/job/${job.id}`
        });
      }
    });

    // Check profile completeness
    const completeness = calculateProfileCompleteness(profile);
    if (completeness < 80) {
      alerts.push({
        type: 'info',
        message: `Complete your profile to get more job opportunities (${completeness}% complete)`,
        action: 'Complete Profile',
        href: '/profile'
      });
    }

    // Check earnings performance
    if (earnings.thisMonth > 0) {
      const avgDaily = earnings.thisMonth / new Date().getDate();
      if (avgDaily < 50) { // Assuming $50/day is a threshold
        alerts.push({
          type: 'success',
          message: `Great job! You've earned $${earnings.thisMonth.toFixed(2)} this month. Keep it up!`,
          action: 'View Earnings',
          href: '/jobs'
        });
      }
    }

    return alerts;
  };

  // Use imported date utilities
  const formatTime = (timeString) => {
    return formatTimeUtil(timeString);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDateUtil(dateString, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default: return <BellIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header with Personalization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {profile?.first_name || user?.first_name || 'there'}!
            </h1>
            <p className="text-blue-100 text-lg">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">{dashboardData.quickStats.todayJobs} jobs today</span>
              </div>
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">${dashboardData.earnings.thisMonth.toFixed(2)} this month</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {dashboardData.quickStats.profileCompleteness}%
            </div>
            <div className="text-blue-200">Profile Complete</div>
          </div>
      </div>
      </motion.div>
        
      {/* Alerts Section */}
      {dashboardData.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {dashboardData.alerts.map((alert, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border-l-4 border-blue-500 p-4">
              <div className="flex items-start">
                {getAlertIcon(alert.type)}
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                </div>
                <button
                  onClick={() => navigate(alert.href)}
                  className="ml-3 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {alert.action} →
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

        {/* Enhanced Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        {/* Upcoming Assignments */}
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming Assignments
                    </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.upcomingAssignments}
                  </dd>
                  </dl>
                </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => navigate('/jobs')}
                className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
              >
                View all jobs <ArrowRightIcon className="h-4 w-4 ml-1" />
              </button>
              </div>
            </div>
          </div>

        {/* Hours This Month */}
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Hours This Month
                    </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.hoursThisMonth.toFixed(1)}
                  </dd>
                  </dl>
                </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-green-600 font-medium">
                +2.5h from last month
              </span>
              </div>
            </div>
          </div>

        {/* Earnings This Month */}
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                    Earnings This Month
                    </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    ${dashboardData.earnings.thisMonth.toFixed(2)}
                  </dd>
                  </dl>
                </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-green-600 font-medium">
                +12% from last month
              </span>
              </div>
            </div>
          </div>

        {/* Jobs Completed */}
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Jobs Completed
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.totalJobs}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-purple-600 font-medium">
                All time
              </span>
            </div>
          </div>
        </div>

        {/* Available Jobs */}
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MagnifyingGlassIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Available Jobs
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {dashboardData.stats.availableJobs}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => navigate('/jobs/search')}
                className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
              >
                View all jobs <ArrowRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
        </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white shadow rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Assignments</h3>
            <button
              onClick={() => navigate('/jobs')}
              className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
            >
              View all <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {dashboardData.upcomingJobs.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.upcomingJobs.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {job.title || 'Interpretation Service'}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>{formatDate(job.scheduled_date)}</span>
                            <span>{formatTime(job.scheduled_time)}</span>
                            {job.location && (
                              <span className="flex items-center">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.assignment_status)}`}>
                        {job.assignment_status}
                      </span>
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming assignments</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check the job board for new opportunities.
              </p>
              <button
                onClick={() => navigate('/jobs/search')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Search Jobs
              </button>
            </div>
          )}
        </motion.div>

        {/* Quick Actions & Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/jobs/search')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <MagnifyingGlassIcon className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Search Jobs</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Update Profile</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={() => navigate('/jobs')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-yellow-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">View All Jobs</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Jobs Completed</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboardData.performance.jobsCompleted}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month Earnings</span>
                <span className="text-sm font-medium text-gray-900">
                  ${dashboardData.earnings.thisMonth.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month Hours</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboardData.stats.hoursThisMonth.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Upcoming Jobs</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboardData.stats.upcomingAssignments}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white shadow rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <button
            onClick={() => navigate('/jobs')}
            className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
          >
            View all <ArrowRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        {dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.assignment_status === 'completed' ? 'bg-green-500' :
                      activity.assignment_status === 'accepted' ? 'bg-blue-500' :
                      activity.assignment_status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-900">
                      {activity.assignment_status === 'completed' ? 'Completed' :
                       activity.assignment_status === 'accepted' ? 'Accepted' :
                       activity.assignment_status === 'pending' ? 'Applied for' : 'Updated'} job
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.title || 'Interpretation Service'} • {formatDate(activity.scheduled_date)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {activity.assignment_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your job applications and completions will appear here.
            </p>
          </div>
        )}
        </motion.div>
    </div>
  );
};

export default Dashboard;