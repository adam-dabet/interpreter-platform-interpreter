import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import TransportationTripLegs from '../components/transportation/TransportationTripLegs';
import toast from 'react-hot-toast';
import { transportationProviderAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { TRANSPORTATION_PREFERRED_RATES } from '../utils/constants';
import {
  calculateProviderQuoteTotal,
  shouldIncludeWaitCost,
  shouldIncludeLoadFee,
  buildRatesFromSource,
} from '../utils/transportationRateUtils';
import { formatTransportationServiceType } from '../utils/providerUtils';
import { formatTime } from '../utils/dateUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const RATE_MODES = [
  {
    id: 'preferred',
    label: 'Preferred platform rates',
    hint: 'Submit at our standard rates and this trip is assigned to you immediately.',
  },
  { id: 'profile', label: 'My profile rates', hint: 'Admin review required before assignment.' },
  { id: 'custom', label: 'Custom itemized rates', hint: 'Admin review required before assignment.' },
  { id: 'flat_total', label: 'Flat rate total', hint: 'Admin review required before assignment.' },
];

const TransportationTripOpportunity = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [rateMode, setRateMode] = useState('profile');
  const [rates, setRates] = useState({
    rate_per_mile: '',
    rate_per_hour_wait: '',
    load_fee: '',
    toll_roads_fee: '',
    no_show_fee: '',
    flat_rate: '',
    dead_miles: '',
  });
  const [notes, setNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);

  const job = detail?.job;
  const serviceType = (job?.transportation_service_type || '').toLowerCase();
  const profileRates = useMemo(() => {
    const raw = detail?.profile_rates;
    if (!raw) return {};
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [detail?.profile_rates]);
  const existingQuote = detail?.quote;
  const isSubmitted = existingQuote?.status === 'submitted' && existingQuote?.is_available;
  const isDeclined = existingQuote?.is_available === false;

  const availableRateModes = useMemo(() => {
    if (serviceType === 'ambulatory' || serviceType === 'wheelchair') {
      return RATE_MODES;
    }
    return RATE_MODES.filter((m) => m.id !== 'preferred');
  }, [serviceType]);

  useEffect(() => {
    loadDetail();
  }, [jobId]);

  useEffect(() => {
    if (!job || !rateMode || existingQuote?.is_available) return;
    if (rateMode === 'flat_total') {
      const built = buildRatesFromSource('profile', serviceType, profileRates, TRANSPORTATION_PREFERRED_RATES);
      setRates((prev) => ({
        ...prev,
        rate_per_hour_wait: prev.rate_per_hour_wait || built.rate_per_hour_wait || '',
      }));
      return;
    }
    const built = buildRatesFromSource(rateMode, serviceType, profileRates, TRANSPORTATION_PREFERRED_RATES);
    setRates((prev) => ({
      ...prev,
      ...built,
      flat_rate: '',
    }));
  }, [rateMode, job?.id, serviceType, detail?.profile_rates, existingQuote?.is_available]);

  useEffect(() => {
    if (existingQuote && existingQuote.is_available) {
      setRateMode(existingQuote.rate_source || 'custom');
      setRates({
        rate_per_mile: existingQuote.rate_per_mile ?? '',
        rate_per_hour_wait: existingQuote.rate_per_hour_wait ?? '',
        load_fee: existingQuote.load_fee ?? '',
        toll_roads_fee: existingQuote.toll_roads_fee ?? '',
        no_show_fee: existingQuote.no_show_fee ?? '',
        flat_rate: existingQuote.flat_rate ?? '',
        dead_miles: existingQuote.dead_miles ?? '',
      });
      setNotes(existingQuote.notes || '');
    }
  }, [existingQuote]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const response = await transportationProviderAPI.getAvailableTrip(jobId);
      setDetail(response.data);
    } catch (error) {
      toast.error('Failed to load trip details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showWaitRate = job && shouldIncludeWaitCost(job);
  const showLoadFee = shouldIncludeLoadFee(serviceType);
  const isFlatMode = rateMode === 'flat_total';
  const isReadOnlyRates = rateMode === 'preferred' || rateMode === 'profile';

  const estimatedTotal = useMemo(() => {
    if (!job) return 0;
    return calculateProviderQuoteTotal(job, rates, {
      provider_wait_time_prorated: job.provider_wait_time_prorated,
    });
  }, [job, rates]);

  const handleRateChange = (field, value) => {
    setRates((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitQuote = async () => {
    try {
      setSubmitting(true);
      const response = await transportationProviderAPI.submitQuote(jobId, {
        rate_source: rateMode,
        ...rates,
        notes,
      });
      const autoAssigned = response.data?.auto_assigned === true;

      if (autoAssigned) {
        toast.success(
          response.message ||
            'You have been automatically assigned to this trip at preferred platform rates.'
        );
        navigate(`/transportation/trips/${jobId}`);
        return;
      }

      toast.success(response.message || 'Quote submitted successfully');
      await loadDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setSubmitting(true);
      await transportationProviderAPI.declineTrip(jobId, { decline_reason: declineReason });
      toast.success('Response recorded');
      await loadDetail();
      setShowDecline(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">Trip not found or no longer available for quoting.</p>
        <Link to="/trips/find">
          <Button variant="outline">Back to Find Trips</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/trips/find"
        className="inline-flex items-center text-sm text-teal-700 hover:text-teal-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Find Trips
      </Link>

      <div className="bg-white rounded-lg border overflow-hidden mb-6">
        <div className="bg-teal-600 text-white px-6 py-5">
          <p className="text-teal-100 text-sm">Trip #{job.job_number}</p>
          <h1 className="text-2xl font-bold mt-1">Trip Opportunity</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-2 py-1 rounded-full bg-white/20">
              {formatTransportationServiceType(job.transportation_service_type)}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20 capitalize">
              {(job.trip_type || 'one way').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Schedule</h2>
            <p className="text-gray-900">{formatDate(job.scheduled_date)}</p>
            {(job.pickup_time || job.scheduled_time) && (
              <p className="text-gray-700 mt-1">Pickup: {formatTime(job.pickup_time || job.scheduled_time)}</p>
            )}
            {job.appointment_type && (
              <p className="text-gray-600 text-sm mt-1">{job.appointment_type}</p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Locations</h2>
            <TransportationTripLegs
              locations={job.locations}
              tripType={job.trip_type}
              pickupLocation={job.pickup_location}
              dropoffLocation={job.dropoff_location}
            />
          </section>

          {job.calculated_mileage != null && (
            <p className="text-sm text-gray-600">
              Estimated mileage: {Math.ceil(Number(job.calculated_mileage))} miles
            </p>
          )}
          {job.wait_time > 0 && (
            <p className="text-sm text-gray-600">Wait time: {job.wait_time} minutes</p>
          )}
        </div>
      </div>

      {isDeclined ? (
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <p className="text-gray-700">You marked yourself as not available for this trip.</p>
          {existingQuote?.decline_reason && (
            <p className="text-sm text-gray-500 mt-2">{existingQuote.decline_reason}</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Submit Your Quote</h2>
            <p className="text-sm text-gray-600">
              Choose your rate source and confirm the amounts you are quoting for this trip.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableRateModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setRateMode(mode.id)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                  rateMode === mode.id
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="block">{mode.label}</span>
                {mode.hint && (
                  <span className={`block text-xs font-normal mt-1 ${
                    rateMode === mode.id ? 'text-teal-800' : 'text-gray-500'
                  }`}>
                    {mode.hint}
                  </span>
                )}
              </button>
            ))}
          </div>

          {rateMode === 'preferred' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900">Instant assignment</p>
              <p className="text-sm text-green-800 mt-1">
                When you submit at preferred platform rates, this trip is automatically assigned to you.
                You do not need to wait for admin review. The trip will appear on your Dashboard, and
                you will receive a confirmation email with trip details.
              </p>
              <p className="text-xs text-green-700 mt-2">
                Ambulatory: ${TRANSPORTATION_PREFERRED_RATES.ambulatory.toFixed(2)}/mi ·
                Wheelchair: ${TRANSPORTATION_PREFERRED_RATES.wheelchair.toFixed(2)}/mi
              </p>
            </div>
          )}

          {rateMode !== 'preferred' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                Custom, profile, and flat-rate quotes are reviewed by our team before a provider is assigned.
              </p>
            </div>
          )}

          {isFlatMode ? (
            <div className="space-y-4">
              <Input
                label="Flat Rate Total ($)"
                type="number"
                step="0.01"
                min="0"
                value={rates.flat_rate}
                onChange={(e) => handleRateChange('flat_rate', e.target.value)}
              />
              {showWaitRate && (
                <Input
                  label="Per Hour Wait ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.rate_per_hour_wait}
                  onChange={(e) => handleRateChange('rate_per_hour_wait', e.target.value)}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Per Mile Rate ($)"
                type="number"
                step="0.01"
                min="0"
                value={rates.rate_per_mile}
                onChange={(e) => handleRateChange('rate_per_mile', e.target.value)}
                disabled={isReadOnlyRates}
              />
              <Input
                label="Dead Miles (optional)"
                type="number"
                step="0.1"
                min="0"
                value={rates.dead_miles}
                onChange={(e) => handleRateChange('dead_miles', e.target.value)}
                helper="Empty miles to reach pickup, billed at your per-mile rate"
              />
              {showWaitRate && (
                <Input
                  label="Per Hour Wait ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.rate_per_hour_wait}
                  onChange={(e) => handleRateChange('rate_per_hour_wait', e.target.value)}
                  disabled={isReadOnlyRates}
                />
              )}
              {showLoadFee && (
                <Input
                  label="Load Fee ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.load_fee}
                  onChange={(e) => handleRateChange('load_fee', e.target.value)}
                  disabled={isReadOnlyRates}
                />
              )}
              <Input
                label="Toll Roads Fee ($)"
                type="number"
                step="0.01"
                min="0"
                value={rates.toll_roads_fee}
                onChange={(e) => handleRateChange('toll_roads_fee', e.target.value)}
              />
              <Input
                label="No Show Fee ($) — informational"
                type="number"
                step="0.01"
                min="0"
                value={rates.no_show_fee}
                onChange={(e) => handleRateChange('no_show_fee', e.target.value)}
              />
            </div>
          )}

          {isFlatMode && showWaitRate && (
            <Input
              label="Per Hour Wait ($) — added to flat rate if applicable"
              type="number"
              step="0.01"
              min="0"
              value={rates.rate_per_hour_wait}
              onChange={(e) => handleRateChange('rate_per_hour_wait', e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Any additional information for our team..."
            />
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-center justify-between">
            <span className="font-medium text-teal-900">Estimated earnings for this trip</span>
            <span className="text-2xl font-bold text-teal-800">${estimatedTotal.toFixed(2)}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmitQuote} disabled={submitting}>
              {isSubmitted
                ? 'Update Quote'
                : rateMode === 'preferred'
                  ? 'Accept Platform Rates & Get Assigned'
                  : 'Submit Quote'}
            </Button>
            <Button variant="outline" onClick={() => setShowDecline(!showDecline)} disabled={submitting}>
              Not Available
            </Button>
          </div>

          {showDecline && (
            <div className="border-t pt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <Button variant="secondary" onClick={handleDecline} disabled={submitting}>
                Confirm Not Available
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransportationTripOpportunity;
