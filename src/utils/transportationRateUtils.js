const LOAD_FEE_SERVICE_TYPES = ['wheelchair', 'bls', 'als'];

export function getProviderWaitHoursBilled(minutes, prorated = false) {
  const m = parseFloat(minutes) || 0;
  if (m <= 0) return 0;
  return prorated ? m / 60 : Math.ceil(m / 60);
}

export function getProviderWaitCost(minutes, ratePerHour, prorated = false) {
  return getProviderWaitHoursBilled(minutes, prorated) * (parseFloat(ratePerHour) || 0);
}

function getProviderItemizedMileageCost(job, ratePerMile) {
  const rate = parseFloat(ratePerMile) || 0;
  if (!rate) return 0;
  const mileage = parseFloat(job.calculated_mileage) || 0;
  return Math.ceil(mileage) * rate;
}

export function shouldIncludeWaitCost(job) {
  const waitTime = parseFloat(job.wait_time) || 0;
  const tripType = (job.trip_type || '').toLowerCase();
  return waitTime > 0 || tripType === 'round_trip_wait' || tripType === 'round_trip_call';
}

export function shouldIncludeLoadFee(serviceType) {
  return LOAD_FEE_SERVICE_TYPES.includes((serviceType || '').toLowerCase());
}

export function getDeadMileCost(rates) {
  const deadMiles = parseFloat(rates.dead_miles) || 0;
  const ratePerMile = parseFloat(rates.rate_per_mile) || 0;
  if (deadMiles <= 0 || ratePerMile <= 0) return 0;
  return Math.ceil(deadMiles) * ratePerMile;
}

export function calculateProviderQuoteTotal(job, rates, options = {}) {
  const prorated = options.provider_wait_time_prorated === true;
  const serviceType = (job.transportation_service_type || '').toLowerCase();
  const flatRate = parseFloat(rates.flat_rate);

  let total = 0;

  if (flatRate && !Number.isNaN(flatRate) && flatRate > 0) {
    total = flatRate;
    if (shouldIncludeWaitCost(job) && rates.rate_per_hour_wait) {
      total += getProviderWaitCost(job.wait_time, rates.rate_per_hour_wait, prorated);
    }
    if (rates.toll_roads_fee) {
      total += parseFloat(rates.toll_roads_fee) || 0;
    }
    return Math.round(total * 100) / 100;
  }

  if (rates.rate_per_mile) {
    total += getProviderItemizedMileageCost(job, rates.rate_per_mile);
  }

  total += getDeadMileCost(rates);

  if (shouldIncludeWaitCost(job) && rates.rate_per_hour_wait) {
    total += getProviderWaitCost(job.wait_time, rates.rate_per_hour_wait, prorated);
  }

  if (shouldIncludeLoadFee(serviceType) && rates.load_fee && parseFloat(rates.load_fee) > 0) {
    total += (parseInt(job.number_of_loads, 10) || 1) * parseFloat(rates.load_fee);
  }

  if (rates.toll_roads_fee) {
    total += parseFloat(rates.toll_roads_fee) || 0;
  }

  return Math.round(total * 100) / 100;
}

export function buildRatesFromSource(source, serviceType, profileRates, preferredRates) {
  const type = (serviceType || '').toLowerCase();
  const profile = profileRates?.[type] || {};

  if (source === 'preferred') {
    return {
      rate_per_mile: preferredRates[type] ?? profile.per_mile ?? '',
      rate_per_hour_wait: profile.per_hour_wait ?? '',
      load_fee: profile.load_fee ?? '',
      toll_roads_fee: '',
      no_show_fee: profile.no_show_fee ?? '',
      flat_rate: '',
    };
  }

  if (source === 'profile') {
    return {
      rate_per_mile: profile.per_mile ?? '',
      rate_per_hour_wait: profile.per_hour_wait ?? '',
      load_fee: profile.load_fee ?? '',
      toll_roads_fee: '',
      no_show_fee: profile.no_show_fee ?? '',
      flat_rate: '',
    };
  }

  return {
    rate_per_mile: '',
    rate_per_hour_wait: '',
    load_fee: '',
    toll_roads_fee: '',
    no_show_fee: '',
    flat_rate: '',
  };
}

export function getProviderApprovedTotal(trip) {
  if (trip?.provider_earnings != null && trip.provider_earnings !== '') {
    return Number(trip.provider_earnings);
  }

  const rates = {
    rate_per_mile: trip?.provider_rate_per_mile,
    rate_per_hour_wait: trip?.provider_rate_per_hour_wait,
    load_fee: trip?.provider_load_fee,
    flat_rate: trip?.provider_flat_rate,
    toll_roads_fee: trip?.provider_toll_roads_fee,
    dead_miles: trip?.provider_dead_miles,
  };
  const hasRates = !!(
    rates.rate_per_mile ||
    rates.flat_rate ||
    rates.rate_per_hour_wait ||
    rates.load_fee
  );

  if (hasRates) {
    const waitTime = resolveTripWaitTime(trip);
    const computed = calculateProviderQuoteTotal(
      { ...trip, wait_time: waitTime },
      rates,
      { provider_wait_time_prorated: trip?.provider_wait_time_prorated === true }
    );
    if (computed > 0) return computed;
  }

  if (!trip?.completion_report_submitted) {
    const flatRate = parseFloat(trip?.provider_flat_rate);
    if (flatRate > 0 && trip?.calculated_rate != null && trip.calculated_rate !== '') {
      return Number(trip.calculated_rate);
    }
    if (flatRate > 0) return flatRate;
    if (trip?.calculated_rate != null && trip.calculated_rate !== '') {
      return Number(trip.calculated_rate);
    }
  }

  return null;
}

function resolveTripWaitTime(trip) {
  const direct = parseFloat(trip?.wait_time);
  if (direct > 0) return direct;

  const data = trip?.completion_report_data;
  if (!data) return 0;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const fromReport = parseInt(parsed?.actual_wait_time, 10);
    if (!Number.isNaN(fromReport) && fromReport > 0) return fromReport;
  } catch {
    // ignore
  }
  return 0;
}

export function isTransportationTripPaid(trip) {
  return trip?.provider_is_paid === true || trip?.status === 'paid_driver' || !!trip?.provider_paid_date;
}

export function getTransportationProviderDisplayStatus(trip) {
  if (trip?.provider_display_status) return trip.provider_display_status;
  if (isTransportationTripPaid(trip)) return 'Paid';
  if (trip?.completion_report_submitted || ['completed', 'billed'].includes(trip?.status)) {
    return 'Completed';
  }
  if (!trip?.status) return 'Unknown';
  return trip.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getTransportationEarningsLabel(trip) {
  const amount = getProviderApprovedTotal(trip);
  if (amount == null) return null;
  if (isTransportationTripPaid(trip)) {
    return { prefix: 'Paid', amount };
  }
  if (trip?.completion_report_submitted) {
    return { prefix: 'Earnings', amount };
  }
  return { prefix: 'Est.', amount };
}

export function getProviderApprovedRateRows(trip) {
  const flatRate = parseFloat(trip?.provider_flat_rate);
  const rows = [];

  if (flatRate > 0) {
    rows.push({ label: 'Flat rate', value: flatRate });
  } else {
    if (trip.provider_rate_per_mile != null && trip.provider_rate_per_mile !== '') {
      rows.push({ label: 'Per mile', value: trip.provider_rate_per_mile });
    }
    if (trip.provider_load_fee != null && trip.provider_load_fee !== '') {
      rows.push({ label: 'Load fee', value: trip.provider_load_fee });
    }
  }

  if (trip.provider_rate_per_hour_wait != null && trip.provider_rate_per_hour_wait !== '') {
    rows.push({ label: 'Per hour wait', value: trip.provider_rate_per_hour_wait });
  }

  return rows;
}
