import React, { useMemo, useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { transportationProviderAPI } from '../services/api';
import toast from 'react-hot-toast';

const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const periodOptions = ['AM', 'PM'];

function parseDateToTimeParts(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const hour24 = d.getHours();
  const minute = d.getMinutes();
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function formatCompletionTime(hour, minute, period) {
  let hour24 = parseInt(hour, 10);
  if (period === 'AM' && hour24 === 12) hour24 = 0;
  else if (period === 'PM' && hour24 !== 12) hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute} ${period}`;
}

function convertTo24Hour(hour, period) {
  const h = parseInt(hour, 10);
  if (period === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

const TimeSelects = ({ label, hour, minute, period, onChange, hint }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} <span className="text-red-600">*</span>
    </label>
    <div className="grid grid-cols-3 gap-2">
      <select
        value={hour}
        onChange={(e) => onChange(e.target.value, minute, period)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
        required
      >
        {hourOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => onChange(hour, e.target.value, period)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
        required
      >
        {minuteOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => onChange(hour, minute, e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
        required
      >
        {periodOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const TransportationCompletionReport = () => {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { suggestedPickupAt, suggestedDropoffAt, jobNumber } = location.state || {};

  const pickupDefaults = useMemo(
    () => parseDateToTimeParts(suggestedPickupAt) || parseDateToTimeParts(new Date()),
    [suggestedPickupAt]
  );
  const dropoffDefaults = useMemo(
    () => parseDateToTimeParts(suggestedDropoffAt) || parseDateToTimeParts(new Date()),
    [suggestedDropoffAt]
  );

  const [pickupHour, setPickupHour] = useState(pickupDefaults.hour);
  const [pickupMinute, setPickupMinute] = useState(pickupDefaults.minute);
  const [pickupPeriod, setPickupPeriod] = useState(pickupDefaults.period);
  const [dropoffHour, setDropoffHour] = useState(dropoffDefaults.hour);
  const [dropoffMinute, setDropoffMinute] = useState(dropoffDefaults.minute);
  const [dropoffPeriod, setDropoffPeriod] = useState(dropoffDefaults.period);
  const [waitTime, setWaitTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const pickupMinutes = convertTo24Hour(pickupHour, pickupPeriod) * 60 + parseInt(pickupMinute, 10);
    const dropoffMinutes = convertTo24Hour(dropoffHour, dropoffPeriod) * 60 + parseInt(dropoffMinute, 10);

    if (dropoffMinutes <= pickupMinutes) {
      toast.error('Drop-off time must be after pickup time');
      return false;
    }

    if (waitTime === '') {
      toast.error('Please enter wait time in minutes');
      return false;
    }

    const waitMinutes = parseInt(waitTime, 10);
    if (Number.isNaN(waitMinutes) || waitMinutes < 0) {
      toast.error('Wait time must be a non-negative number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await transportationProviderAPI.submitCompletionReport(tripId, {
        actual_pickup_time: formatCompletionTime(pickupHour, pickupMinute, pickupPeriod),
        actual_dropoff_time: formatCompletionTime(dropoffHour, dropoffMinute, dropoffPeriod),
        actual_wait_time: parseInt(waitTime, 10),
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
      toast.success('Completion report submitted');
    } catch (err) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted</h1>
        <p className="text-gray-600 mb-6">
          Your trip is marked completed. You can view your earnings on the trip details page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(`/transportation/trips/${tripId}`)}>
            View Trip & Earnings
          </Button>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        to={`/transportation/trips/${tripId}`}
        className="inline-flex items-center text-sm text-teal-700 hover:text-teal-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to trip
      </Link>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-teal-600 text-white px-6 py-5">
          <h1 className="text-2xl font-bold">Completion Report</h1>
          {jobNumber && <p className="text-teal-100 text-sm mt-1">Trip #{jobNumber}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Start and end times are prefilled from your trip tracking but you can edit them.
            Please enter the wait time before submitting.
          </p>

          <TimeSelects
            label="Actual Pickup Time"
            hour={pickupHour}
            minute={pickupMinute}
            period={pickupPeriod}
            onChange={(h, m, p) => {
              setPickupHour(h);
              setPickupMinute(m);
              setPickupPeriod(p);
            }}
            hint="The actual time the passenger was picked up"
          />

          <TimeSelects
            label="Final Drop-off Time"
            hour={dropoffHour}
            minute={dropoffMinute}
            period={dropoffPeriod}
            onChange={(h, m, p) => {
              setDropoffHour(h);
              setDropoffMinute(m);
              setDropoffPeriod(p);
            }}
            hint="The actual time the passenger was dropped off"
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wait Time (minutes) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={waitTime}
              onChange={(e) => setWaitTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Enter wait time in minutes"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Any additional notes about the trip"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <LoadingSpinner size="sm" /> : 'Submit Completion Report'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TransportationCompletionReport;
