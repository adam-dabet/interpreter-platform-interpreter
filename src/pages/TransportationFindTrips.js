import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, TruckIcon } from '@heroicons/react/24/outline';
import { transportationProviderAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { formatTransportationServiceType } from '../utils/providerUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const responseBadge = (status) => {
  switch (status) {
    case 'quoted':
      return 'bg-green-100 text-green-800';
    case 'not_available':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

const responseLabel = (status) => {
  switch (status) {
    case 'quoted':
      return 'Quoted';
    case 'not_available':
      return 'Not available';
    default:
      return 'Not responded';
  }
};

const TransportationFindTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await transportationProviderAPI.getAvailableTrips();
      setTrips(response.data?.trips || []);
    } catch (error) {
      console.error('Failed to load available trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Find Trips</h1>
        <p className="text-gray-600 mt-1">
          Trips you have been notified about. Submit your availability and quote to be considered for assignment.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">No trip opportunities</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            When our team notifies you about a transportation request, it will appear here for you to review and quote.
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
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${responseBadge(trip.response_status)}`}>
                      {responseLabel(trip.response_status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {formatDate(trip.scheduled_date)}
                    {(trip.pickup_time || trip.scheduled_time) &&
                      ` · Pickup ${trip.pickup_time || trip.scheduled_time}`}
                  </p>
                  {trip.pickup_city && (
                    <p className="text-sm text-gray-500 mt-1">Pickup: {trip.pickup_city}</p>
                  )}
                  {trip.trip_type && (
                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {trip.trip_type.replace(/_/g, ' ')}
                    </p>
                  )}
                  {trip.quote_estimated_total != null && trip.response_status === 'quoted' && (
                    <p className="text-sm font-medium text-green-700 mt-2">
                      Your quote: ${Number(trip.quote_estimated_total).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/trips/find/${trip.id}`}>
                    <Button size="sm">
                      {trip.response_status === 'quoted' ? 'View Quote' : 'View & Quote'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
        <TruckIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-900">
          Assigned trips appear on your <Link to="/dashboard" className="underline font-medium">Dashboard</Link>.
        </p>
      </div>
    </div>
  );
};

export default TransportationFindTrips;
