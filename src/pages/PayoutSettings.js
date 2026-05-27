import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { interpreterAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const STATUS_META = {
  not_started: {
    label: 'Get paid faster with direct deposit',
    tone: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    icon: BanknotesIcon,
    blurb: 'Add your bank information to receive job earnings via direct deposit — the fastest way to get paid. Takes about 2 minutes.',
  },
  incomplete: {
    label: 'Finish setting up direct deposit',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: ExclamationTriangleIcon,
    blurb: 'You started payout setup but have not finished it. Complete your bank information to receive payments directly to your account.',
  },
  active: {
    label: 'Ready for payouts',
    tone: 'bg-green-50 text-green-800 border-green-200',
    icon: CheckCircleIcon,
    blurb: 'Your payout method is verified and ready to receive payments.',
  },
  suspended: {
    label: 'Suspended',
    tone: 'bg-red-50 text-red-800 border-red-200',
    icon: ExclamationTriangleIcon,
    blurb: 'Your payout account is suspended. Please contact support.',
  },
  archived: {
    label: 'Archived',
    tone: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: ExclamationTriangleIcon,
    blurb: 'Your payout account is archived.',
  },
};

const PayoutSettings = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [widgetUrl, setWidgetUrl] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await interpreterAPI.getTrolleyStatus();
      setStatus(res?.data || null);
    } catch (err) {
      console.error('Failed to load Trolley status', err);
      toast.error('Could not load payout status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const openWidget = async () => {
    setWidgetLoading(true);
    try {
      const res = await interpreterAPI.getTrolleyWidgetLink();
      if (!res?.url) throw new Error('No widget URL returned');
      setWidgetUrl(res.url);
    } catch (err) {
      console.error('Failed to get widget link', err);
      toast.error(err.message || 'Could not open payout setup.');
    } finally {
      setWidgetLoading(false);
    }
  };

  const closeWidget = () => {
    setWidgetUrl(null);
    // Refresh status after closing in case the user just finished onboarding.
    // The webhook will eventually catch this, but a manual refresh gives
    // immediate UI feedback.
    setTimeout(() => loadStatus(), 750);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const meta = STATUS_META[status?.status] || STATUS_META.not_started;
  const Icon = meta.icon;
  const isActive = status?.status === 'active';

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8">
      <div className="flex items-center space-x-3 mb-6">
        <BanknotesIcon className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Payout Settings</h1>
      </div>

      <div className={`border rounded-lg p-5 mb-6 ${meta.tone}`}>
        <div className="flex items-start space-x-3">
          <Icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{meta.label}</p>
            <p className="text-sm mt-1">{meta.blurb}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Payout method</dt>
            <dd className="text-gray-900 font-medium capitalize">
              {status?.payoutMethod ? status.payoutMethod.replace('-', ' ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Currency</dt>
            <dd className="text-gray-900 font-medium">
              {status?.currency || 'USD'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Onboarded at</dt>
            <dd className="text-gray-900 font-medium">
              {status?.onboardedAt ? new Date(status.onboardedAt).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last updated</dt>
            <dd className="text-gray-900 font-medium">
              {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={openWidget}
          disabled={widgetLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {widgetLoading ? 'Opening…' : isActive ? 'Update payout method' : 'Set up payout method'}
        </Button>
        <button
          type="button"
          onClick={() => loadStatus()}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Refresh status
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Payout setup is handled securely by our payments partner, Trolley. Your bank
        information is never stored on our servers. Tax forms (W-9) are collected
        separately through your interpreter profile.
      </p>

      {/* Widget modal */}
      {widgetUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Payout setup</h3>
              <button
                type="button"
                onClick={closeWidget}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="Trolley payout setup"
              src={widgetUrl}
              className="flex-1 w-full rounded-b-lg"
              allow="clipboard-write; clipboard-read"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutSettings;
