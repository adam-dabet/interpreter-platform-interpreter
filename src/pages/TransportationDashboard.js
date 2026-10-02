import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { transportationProviderAPI, interpreterAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import {
  formatTransportationServiceType,
} from '../utils/providerUtils';
import {
  getTransportationProviderDisplayStatus,
  getTransportationEarningsLabel,
  isTransportationTripPaid,
} from '../utils/transportationRateUtils';
import {
  getTransportationTripAction,
  sortTripsByActionPriority,
} from '../utils/transportationTripActions';
import { formatTime } from '../utils/dateUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TransportationDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState(null);
  const [payoutBannerDismissed, setPayoutBannerDismissed] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [filter]);

  useEffect(() => {
    loadPayoutStatus();
  }, []);

  const loadPayoutStatus = async () => {
    try {
      const payoutRes = await interpreterAPI.getTrolleyStatus().catch(() => null);
      setPayoutStatus(payoutRes?.data || null);

      const userId = user?.id || profile?.id || 'anon';
      const dismissedAtRaw = localStorage.getItem(`payoutBannerDismissedAt:${userId}`);
      const dismissedAt = dismissedAtRaw ? parseInt(dismissedAtRaw, 10) : 0;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      setPayoutBannerDismissed(Boolean(dismissedAt) && (Date.now() - dismissedAt) < SEVEN_DAYS_MS);
    } catch (error) {
      // Banner just won't show
    }
  };

  const dismissPayoutBanner = () => {
    const userId = user?.id || profile?.id || 'anon';
    localStorage.setItem(`payoutBannerDismissedAt:${userId}`, String(Date.now()));
    setPayoutBannerDismissed(true);
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await transportationProviderAPI.getMyTrips({ status: filter });
      const loaded = response.data?.trips || [];
      setTrips(sortTripsByActionPriority(loaded));
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

  const openTrip = (trip) => {
    const action = getTransportationTripAction(trip);
    if (action?.type === 'submit_report') {
      navigate(`/transportation/trips/${trip.id}/completion-report`, {
        state: { jobNumber: trip.job_number },
      });
      return;
    }
    navigate(`/transportation/trips/${trip.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Transportation Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back{displayName ? `, ${displayName}` : ''}. View your assigned trips below.
        </p>
      </div>

      {payoutStatus
        && ['not_started', 'incomplete'].includes(payoutStatus.status)
        && !payoutBannerDismissed && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 rounded-lg p-2 flex-shrink-0">
              <BanknotesIcon className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-900">
                Get paid faster with direct deposit
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                Add your bank info to receive trip earnings via direct deposit — the
                fastest way to get paid. Takes about 2 minutes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => navigate('/payout-settings')}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {payoutStatus.status === 'incomplete' ? 'Finish setup' : 'Set up payment method'}
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
                <button
                  type="button"
                  onClick={dismissPayoutBanner}
                  className="text-sm text-emerald-700 hover:text-emerald-900 px-2 py-1"
                >
                  Remind me later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPayoutBanner}
              className="p-1 rounded-md text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 flex-shrink-0"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

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
          { key: 'action_needed', label: 'Action Needed' },
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
            {filter === 'action_needed'
              ? 'No trips need your attention right now.'
              : filter === 'upcoming'
              ? 'You have no upcoming trips. New assignments will appear here and you will also receive email notifications.'
              : filter === 'needs_report'
              ? 'No completed trips are waiting for a completion report.'
              : 'No completed trips yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const displayStatus = getTransportationProviderDisplayStatus(trip);
            const earningsLabel = getTransportationEarningsLabel(trip);
            const isPaid = isTransportationTripPaid(trip);
            const action = getTransportationTripAction(trip);

            return (
            <div
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() => openTrip(trip)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openTrip(trip);
                }
              }}
              className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-gray-900">#{trip.job_number}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 font-medium">
                      {formatTransportationServiceType(trip.transportation_service_type)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {displayStatus}
                    </span>
                    {action && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        action.tone === 'green'
                          ? 'bg-green-100 text-green-800'
                          : action.tone === 'teal'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {action.shortLabel}
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
                  {earningsLabel && (
                    <p className={`text-sm font-medium ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>
                      {earningsLabel.prefix}: ${Number(earningsLabel.amount).toFixed(2)}
                    </p>
                  )}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTrip(trip)}
                    >
                      {action ? action.shortLabel : 'View Details'}
                    </Button>
                    {trip.completion_report_path && !trip.completion_report_submitted && (
                      <a href={trip.completion_report_path}>
                        <Button size="sm">Submit Report</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransportationDashboard;
