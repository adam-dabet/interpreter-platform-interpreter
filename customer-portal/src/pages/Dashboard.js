import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon, 
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Dashboard = () => {
  const { customer, makeAuthenticatedRequest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    recentAppointments: [],
    upcomingAppointments: [],
    claimants: [],
    claims: [],
    stats: {
      totalAppointments: 0,
      upcomingCount: 0,
      completedCount: 0,
      claimantsCount: 0
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all dashboard data in parallel
      const [appointmentsResponse, claimantsResponse, claimsResponse] = await Promise.all([
        makeAuthenticatedRequest(`${API_BASE}/customer/appointments?limit=10`),
        makeAuthenticatedRequest(`${API_BASE}/customer/claimants`),
        makeAuthenticatedRequest(`${API_BASE}/customer/claims`)
      ]);

      const appointmentsData = await appointmentsResponse.json();
      const claimantsData = await claimantsResponse.json();
      const claimsData = await claimsResponse.json();

      if (appointmentsData.success && claimantsData.success && claimsData.success) {
        const appointments = appointmentsData.data.appointments || [];
        const claimants = claimantsData.data || [];
        const claims = claimsData.data || [];

        // Separate upcoming and recent appointments
        const now = new Date();
        const upcomingAppointments = appointments.filter(apt => 
          new Date(apt.scheduled_date) >= now && 
          ['open', 'assigned', 'in_progress'].includes(apt.status)
        );
        const recentAppointments = appointments.filter(apt => 
          new Date(apt.scheduled_date) < now || 
          ['completed', 'cancelled'].includes(apt.status)
        ).slice(0, 5);

        const completedCount = appointments.filter(apt => apt.status === 'completed').length;

        setDashboardData({
          recentAppointments,
          upcomingAppointments,
          claimants: claimants.slice(0, 5), // Show first 5 claimants
          claims: claims.slice(0, 5), // Show first 5 claims
          stats: {
            totalAppointments: appointments.length,
            upcomingCount: upcomingAppointments.length,
            completedCount,
            claimantsCount: claimants.length
          }
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100';
      case 'assigned': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-purple-600 bg-purple-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {customer?.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your interpreter services and appointments
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalAppointments}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.upcomingCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Claimants</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.claimantsCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.completedCount}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
                <button
                  onClick={() => navigate('/appointments/new')}
                  className="flex items-center text-blue-600 hover:text-blue-500 font-medium"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New
                </button>
              </div>
            </div>
            <div className="p-6">
              {dashboardData.upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Schedule a new appointment to get started.
                  </p>
                  <button
                    onClick={() => navigate('/appointments/new')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Schedule Appointment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{appointment.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(appointment.scheduled_date)} at {formatTime(appointment.scheduled_time)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.claimant_first_name} {appointment.claimant_last_name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => navigate(`/appointments/${appointment.id}`)}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/appointments')}
                    className="w-full text-center text-blue-600 hover:text-blue-500 font-medium py-2"
                  >
                    View All Appointments
                    <ArrowRightIcon className="h-4 w-4 ml-1 inline" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
            </div>
            <div className="p-6">
              {dashboardData.recentAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent appointments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your appointment history will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.recentAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{appointment.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(appointment.scheduled_date)} at {formatTime(appointment.scheduled_time)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.claimant_first_name} {appointment.claimant_last_name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => navigate(`/appointments/${appointment.id}`)}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/appointments')}
                    className="w-full text-center text-blue-600 hover:text-blue-500 font-medium py-2"
                  >
                    View All Appointments
                    <ArrowRightIcon className="h-4 w-4 ml-1 inline" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Schedule New Appointment</h3>
                <p className="text-sm text-gray-500">Request an interpreter for a new appointment</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon className="h-8 w-8 text-green-600 mr-3" />
              <div className="text-left">
                <h3 className="font-medium text-gray-900">View All Appointments</h3>
                <p className="text-sm text-gray-500">See your complete appointment history</p>
              </div>
            </button>
            
            <div className="flex items-center p-4 border border-gray-200 rounded-lg">
              <UsersIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Manage Claimants</h3>
                <p className="text-sm text-gray-500">View and update claimant information</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
