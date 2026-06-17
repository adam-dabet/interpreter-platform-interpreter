import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/outline';
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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const TransportationTripDetails = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const rateRows = [
    { label: 'Per mile', value: trip.provider_rate_per_mile },
    { label: 'Per hour wait', value: trip.provider_rate_per_hour_wait },
    { label: 'Load fee', value: trip.provider_load_fee },
  ].filter((r) => r.value != null && r.value !== '');

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
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {formatTripStatus(trip.status)}
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
                Pickup: {trip.pickup_time || trip.scheduled_time}
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
            <div className="space-y-3">
              {trip.pickup_location && (
                <div className="flex gap-3">
                  <MapPinIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Pick-up</p>
                    <p className="text-gray-900">{trip.pickup_location}</p>
                  </div>
                </div>
              )}
              {trip.dropoff_location && (
                <div className="flex gap-3">
                  <MapPinIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Drop-off</p>
                    <p className="text-gray-900">{trip.dropoff_location}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {rateRows.length > 0 && (
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
              {trip.calculated_mileage != null && (
                <p className="text-sm text-gray-600 mt-3">
                  Estimated miles: {Number(trip.calculated_mileage).toFixed(1)}
                </p>
              )}
              {trip.calculated_rate != null && (
                <p className="text-sm font-medium text-gray-900 mt-1">
                  Estimated total: ${Number(trip.calculated_rate).toFixed(2)}
                </p>
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
