const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show', 'billed', 'paid_driver'];

export function getTransportationTripAction(trip) {
  if (!trip) return null;

  if (trip.status === 'completed' && !trip.completion_report_submitted) {
    return {
      type: 'submit_report',
      label: 'Submit completion report',
      shortLabel: 'Submit report',
      priority: 1,
      tone: 'amber',
    };
  }

  if (!trip.provider_confirmed && !TERMINAL_STATUSES.includes(trip.status)) {
    return {
      type: 'confirm',
      label: 'Confirm appointment',
      shortLabel: 'Confirm',
      priority: 2,
      tone: 'amber',
    };
  }

  return null;
}

export function tripNeedsProviderAction(trip) {
  const action = getTransportationTripAction(trip);
  return !!action && ['confirm', 'submit_report'].includes(action.type);
}

export function sortTripsByActionPriority(trips) {
  return [...trips].sort((a, b) => {
    const pa = getTransportationTripAction(a)?.priority ?? 99;
    const pb = getTransportationTripAction(b)?.priority ?? 99;
    if (pa !== pb) return pa - pb;

    const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
    const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;

    const timeA = a.pickup_time || a.scheduled_time || '';
    const timeB = b.pickup_time || b.scheduled_time || '';
    return String(timeA).localeCompare(String(timeB));
  });
}

export function filterTripsNeedingAction(trips) {
  return trips.filter(tripNeedsProviderAction);
}
