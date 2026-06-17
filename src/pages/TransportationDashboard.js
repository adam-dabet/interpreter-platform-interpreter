import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, DocumentTextIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { transportationProviderAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import {
  formatTransportationServiceType,
  formatTripStatus,
} from '../utils/providerUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr;
};

const TransportationDashboard = () => {
  const { profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await transportationProviderAPI.getMyTrips({ status: filter });
      setTrips(response.data?.trips || []);
    } catch (error) {
      console.error('Failed to load trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const needsReportCount = trips.filter(
    (t) => t.status === 'completed' && !t.completion_report_submitted
  ).length;

  const displayName = profile?.business_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Transportation Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back{displayName ? `, ${displayName}` : ''}. View your assigned trips below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
          <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Assigned Trips</p>
            <p className="text-xl font-semibold text-gray-900">{trips.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
          <TruckIcon className="h-8 w-8 text-teal-600" />
          <div>
            <p className="text-sm text-gray-500">Business</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{profile?.business_name || '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
          <DocumentTextIcon className="h-8 w-8 text-amber-600" />
          <div>
            <p className="text-sm text-gray-500">Reports Needed</p>
            <p className="text-xl font-semibold text-gray-900">{filter === 'needs_report' ? trips.length : needsReportCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: 'needs_report', label: 'Needs Report' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-teal-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">No trips found</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {filter === 'upcoming'
              ? 'You have no upcoming trips. New assignments will appear here and you will also receive email notifications.'
              : filter === 'needs_report'
              ? 'No completed trips are waiting for a completion report.'
              : 'No completed trips yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-gray-900">#{trip.job_number}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 font-medium">
                      {formatTransportationServiceType(trip.transportation_service_type)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {formatTripStatus(trip.status)}
                    </span>
                    {trip.status === 'completed' && !trip.completion_report_submitted && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                        Report needed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Patient:</strong> {trip.claimant_display_name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(trip.scheduled_date)}
                    {trip.pickup_time || trip.scheduled_time
                      ? ` · Pickup ${formatTime(trip.pickup_time || trip.scheduled_time)}`
                      : ''}
                  </p>
                  {trip.trip_type && (
                    <p className="text-sm text-gray-500 mt-1 capitalize">
                      {trip.trip_type.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  {trip.calculated_rate != null && (
                    <p className="text-sm font-medium text-gray-900">
                      Est. ${Number(trip.calculated_rate).toFixed(2)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Link to={`/transportation/trips/${trip.id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                    {trip.completion_report_path && !trip.completion_report_submitted && (
                      <a href={trip.completion_report_path}>
                        <Button size="sm">Submit Report</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransportationDashboard;
