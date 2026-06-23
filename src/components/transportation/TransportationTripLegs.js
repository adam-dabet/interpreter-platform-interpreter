import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { buildTransportationTripLegs } from '../../utils/transportationLocationUtils';

const TransportationTripLegs = ({ locations, tripType, pickupLocation, dropoffLocation }) => {
  const legs = buildTransportationTripLegs(locations, tripType);

  if (legs.length > 0) {
    return (
      <div className="space-y-4">
        {legs.map((leg, index) => (
          <div key={index} className={leg.label ? 'space-y-3' : ''}>
            {leg.label && (
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {leg.label}
              </p>
            )}
            <div className="space-y-3">
              {leg.pickup && (
                <div className="flex gap-3">
                  <MapPinIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Pick-up</p>
                    <p className="text-gray-900">{leg.pickup}</p>
                  </div>
                </div>
              )}
              {leg.dropoff && (
                <div className="flex gap-3">
                  <MapPinIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Drop-off</p>
                    <p className="text-gray-900">{leg.dropoff}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!pickupLocation && !dropoffLocation) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pickupLocation && (
        <div className="flex gap-3">
          <MapPinIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-gray-500">Pick-up</p>
            <p className="text-gray-900">{pickupLocation}</p>
          </div>
        </div>
      )}
      {dropoffLocation && (
        <div className="flex gap-3">
          <MapPinIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-gray-500">Drop-off</p>
            <p className="text-gray-900">{dropoffLocation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportationTripLegs;
