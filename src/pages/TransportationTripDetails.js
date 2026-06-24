import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import TransportationTripLegs from '../components/transportation/TransportationTripLegs';
import { transportationProviderAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SlideToAction from '../components/ui/SlideToAction';
import Button from '../components/ui/Button';
import { useTripLocationTracking } from '../hooks/useTripLocationTracking';
import {
  formatTransportationServiceType,
} from '../utils/providerUtils';
import {
  getProviderApprovedRateRows,
  getTransportationProviderDisplayStatus,
  getTransportationEarningsLabel,
  isTransportationTripPaid,
} from '../utils/transportationRateUtils';
import { formatTime, formatDateTime } from '../utils/dateUtils';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show', 'billed', 'paid_driver'];

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const TransportationTripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [endingTrip, setEndingTrip] = useState(false);

  const canTrackTrip = trip && !TERMINAL_STATUSES.includes(trip.status);
  const {
    trackingActive,
    lastLocationAt,
    trackingError,
    starting,
    stopping,
    startTracking,
    stopTracking,
  } = useTripLocationTracking(tripId, { enabled: canTrackTrip });

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await transportationProviderAPI.getTrip(tripId);
      setTrip(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    const confirmed = window.confirm(
      'Has the patient been dropped off at the final destination?'
    );
    if (!confirmed) return;

    setEndingTrip(true);
    try {
      await stopTracking();
      const result = await transportationProviderAPI.completeTrip(tripId);
      navigate(`/transportation/trips/${tripId}/completion-report`, {
        state: {
          jobNumber: trip?.job_number,
          suggestedPickupAt: result.data?.suggested_pickup_at,
          suggestedDropoffAt: result.data?.suggested_dropoff_at,
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to end trip');
    } finally {
      setEndingTrip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || 'Trip not found'}</p>
        <Link to="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const rateRows = getProviderApprovedRateRows(trip);
  const earningsLabel = getTransportationEarningsLabel(trip);
  const displayStatus = getTransportationProviderDisplayStatus(trip);
  const isPaid = isTransportationTripPaid(trip);
  const showMileage = !trip.provider_flat_rate && trip.calculated_mileage != null;
  const tripIsFinished = TERMINAL_STATUSES.includes(trip.status) || trip.completion_report_submitted;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-teal-700 hover:text-teal-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-teal-600 text-white px-6 py-5">
          <p className="text-teal-100 text-sm">Trip #{trip.job_number}</p>
          <h1 className="text-2xl font-bold mt-1">{trip.claimant_display_name}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {formatTransportationServiceType(trip.transportation_service_type)}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-white/20'}`}>
              {displayStatus}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Schedule
            </h2>
            <p className="text-gray-900">{formatDate(trip.scheduled_date)}</p>
            {(trip.pickup_time || trip.scheduled_time) && (
              <p className="text-gray-700 mt-1">
                Pickup: {formatTime(trip.pickup_time || trip.scheduled_time)}
              </p>
            )}
            {trip.appointment_type && (
              <p className="text-gray-600 text-sm mt-1">{trip.appointment_type}</p>
            )}
            {trip.trip_type && (
              <p className="text-gray-600 text-sm mt-1 capitalize">
                {trip.trip_type.replace(/_/g, ' ')}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Locations
            </h2>
            <TransportationTripLegs
              locations={trip.locations}
              tripType={trip.trip_type}
              pickupLocation={trip.pickup_location}
              dropoffLocation={trip.dropoff_location}
            />
          </section>

          {earningsLabel && tripIsFinished && (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {isPaid ? 'Payment' : 'Your Earnings'}
              </h2>
              <p className={`text-2xl font-bold ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>
                ${Number(earningsLabel.amount).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {isPaid
                  ? `Paid${trip.provider_paid_date ? ` on ${formatDate(trip.provider_paid_date)}` : ''}`
                  : 'Payment pending — we will process your earnings shortly'}
              </p>
            </section>
          )}

          {rateRows.length > 0 && !tripIsFinished && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Approved Rates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rateRows.map((row) => (
                  <div key={row.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{row.label}</p>
                    <p className="font-semibold text-gray-900">${Number(row.value).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              {showMileage && (
                <p className="text-sm text-gray-600 mt-3">
                  Estimated miles: {Number(trip.calculated_mileage).toFixed(1)}
                </p>
              )}
              {earningsLabel && (
                <p className="text-sm font-medium text-gray-900 mt-1">
                  Estimated total: ${Number(earningsLabel.amount).toFixed(2)}
                </p>
              )}
            </section>
          )}

          {canTrackTrip && (
            <section className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Live Location Sharing
              </h2>
              {trackingActive ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900">
                  Sharing your location with our team.
                  {lastLocationAt && (
                    <p className="text-green-800 mt-1 text-xs">
                      Last update: {formatDateTime(lastLocationAt)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Slide to start your trip when you are en route so admin can see your live location.
                </p>
              )}
              {trackingError && (
                <p className="text-sm text-red-600">{trackingError}</p>
              )}
              {(starting || stopping || endingTrip) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <LoadingSpinner size="sm" />
                  <span>Updating trip status…</span>
                </div>
              )}
              {!trackingActive ? (
                <SlideToAction
                  label="Slide to Start Trip"
                  onComplete={startTracking}
                  disabled={starting || stopping || endingTrip}
                  variant="success"
                />
              ) : (
                <SlideToAction
                  label="Slide to End Trip"
                  onComplete={handleEndTrip}
                  disabled={starting || stopping || endingTrip}
                  variant="neutral"
                />
              )}
            </section>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
            <strong>No show?</strong> If the patient is a no-show, please call our office at{' '}
            <a href="tel:8884182565" className="underline">888-418-2565</a> before leaving.
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {trip.completion_report_path && !trip.completion_report_submitted && (
              <a href={trip.completion_report_path}>
                <Button>Submit Completion Report</Button>
              </a>
            )}
            {trip.completion_report_submitted && (
              <span className="inline-flex items-center px-3 py-2 rounded-lg bg-green-100 text-green-800 text-sm font-medium">
                Completion report submitted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportationTripDetails;
