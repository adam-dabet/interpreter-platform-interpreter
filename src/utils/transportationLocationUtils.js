/**
 * Build display legs from transportation location rows.
 * Handles one-way, multi-leg, and round trips (including pickup + dropoff + second_dropoff).
 */
export function buildTransportationTripLegs(locations = [], tripType = '') {
  if (!locations.length) return [];

  const sorted = [...locations].sort(
    (a, b) => (a.leg_sequence || 0) - (b.leg_sequence || 0)
  );

  const pickups = sorted.filter((loc) => loc.location_type === 'pickup');
  const dropoffs = sorted.filter((loc) => loc.location_type === 'dropoff');
  const secondDropoffs = sorted.filter((loc) => loc.location_type === 'second_dropoff');

  const legs = [];
  const pairCount = Math.max(pickups.length, dropoffs.length);

  for (let i = 0; i < pairCount; i += 1) {
    const pickup = pickups[i];
    const dropoff = dropoffs[i];
    if (!pickup && !dropoff) continue;

    legs.push({
      label: getTripLegLabel(i, pairCount, tripType),
      pickup: pickup?.address || null,
      dropoff: dropoff?.address || null,
    });
  }

  if (secondDropoffs.length > 0 && dropoffs.length > 0 && legs.length <= 1) {
    if (legs.length === 1) {
      legs[0].label = getTripLegLabel(0, 2, tripType);
    }
    legs.push({
      label: getTripLegLabel(1, 2, tripType),
      pickup: dropoffs[0]?.address || null,
      dropoff: secondDropoffs[0]?.address || null,
    });
  }

  return legs.filter((leg) => leg.pickup || leg.dropoff);
}

function getTripLegLabel(index, totalLegs, tripType) {
  const normalized = (tripType || '').toLowerCase();
  const isRoundTrip =
    normalized === 'round_trip' ||
    normalized === 'round_trip_call' ||
    normalized === 'round_trip_wait';

  if (isRoundTrip && totalLegs === 2) {
    return index === 0 ? 'Outbound Trip' : 'Return Trip';
  }

  if (totalLegs > 1) {
    return `Leg ${index + 1}`;
  }

  return null;
}
