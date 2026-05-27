import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  BoltIcon,
  ShieldCheckIcon,
  ClockIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { interpreterAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

/**
 * Per-status hero card configuration. Each entry drives the big card at the
 * top of the page (tone, headline, sub-copy, primary-button label).
 */
const STATUS_META = {
  not_started: {
    label: 'Get paid faster with direct deposit',
    tone: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    iconTone: 'bg-emerald-100 text-emerald-700',
    icon: BanknotesIcon,
    blurb: 'Add your bank info to receive job earnings via direct deposit — the fastest way to get paid. Takes about 2 minutes.',
    buttonLabel: 'Set up direct deposit',
  },
  incomplete: {
    label: 'Finish setting up direct deposit',
    tone: 'bg-amber-50 text-amber-900 border-amber-200',
    iconTone: 'bg-amber-100 text-amber-700',
    icon: ClockIcon,
    blurb: "You started but didn't finish payout setup. Pick up where you left off — it only takes a minute or two.",
    buttonLabel: 'Finish setup',
  },
  active: {
    label: "You're ready to receive payments",
    tone: 'bg-green-50 text-green-900 border-green-200',
    iconTone: 'bg-green-100 text-green-700',
    icon: CheckCircleIcon,
    blurb: 'Your bank account is verified. Job earnings will be deposited directly to your account.',
    buttonLabel: 'Update bank info',
  },
  suspended: {
    label: 'Your payout account is suspended',
    tone: 'bg-red-50 text-red-900 border-red-200',
    iconTone: 'bg-red-100 text-red-700',
    icon: ExclamationTriangleIcon,
    blurb: 'We were unable to verify your account. Please contact support so we can help you get this resolved.',
    buttonLabel: 'Review setup',
  },
  archived: {
    label: 'Payout account archived',
    tone: 'bg-gray-100 text-gray-900 border-gray-200',
    iconTone: 'bg-gray-200 text-gray-700',
    icon: ExclamationTriangleIcon,
    blurb: 'Your payout account has been archived. Contact support if you need to reactivate it.',
    buttonLabel: 'Contact support',
  },
};

/* Friendly date formatter: "May 26, 2026" — drops the noisy timestamp. */
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '—';
  }
};

/* Convert "bank-transfer" / "paypal" / null into something readable. */
const formatPayoutMethod = (raw) => {
  if (!raw) return null;
  switch (raw) {
    case 'bank-transfer': return 'Bank account (direct deposit)';
    case 'paypal': return 'PayPal';
    case 'check': return 'Check';
    case 'wire': return 'Wire transfer';
    default: return raw.replace(/[-_]/g, ' ');
  }
};

const PayoutSettings = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [widgetUrl, setWidgetUrl] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async ({ silent } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await interpreterAPI.getTrolleyStatus();
      setStatus(res?.data || null);
    } catch (err) {
      console.error('Failed to load Trolley status', err);
      if (!silent) toast.error('Could not load payout status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus({ silent: true });
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
    // The webhook will reconcile eventually, but refreshing right away gives
    // immediate feedback if the user just finished a step.
    setTimeout(() => loadStatus({ silent: true }), 750);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const currentStatus = status?.status || 'not_started';
  const meta = STATUS_META[currentStatus] || STATUS_META.not_started;
  const Icon = meta.icon;
  const isActive = currentStatus === 'active';
  const isIncomplete = currentStatus === 'incomplete';
  const showSetupGuidance = currentStatus === 'not_started' || isIncomplete;
  const payoutMethodLabel = formatPayoutMethod(status?.payoutMethod);

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BanknotesIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Payout Settings</h1>
        </div>
        <button
          type="button"
          onClick={() => loadStatus()}
          disabled={refreshing}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          aria-label="Refresh status"
          title="Refresh status"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Hero status card */}
      <div className={`border rounded-xl p-5 sm:p-6 mb-6 ${meta.tone}`}>
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-2.5 flex-shrink-0 ${meta.iconTone}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">{meta.label}</h2>
            <p className="text-sm mt-1.5">{meta.blurb}</p>
            <div className="mt-4">
              <Button
                onClick={openWidget}
                disabled={widgetLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {widgetLoading ? 'Opening…' : meta.buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* "What to expect" — only when user hasn't finished setup */}
      {showSetupGuidance && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {isIncomplete ? 'What you have left to do' : "Here's what you'll need"}
          </h3>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <BuildingLibraryIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Your bank account info</div>
                <div className="text-gray-500">Routing number and account number — usually found at the bottom of a check or in your banking app.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ClockIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">A couple of minutes</div>
                <div className="text-gray-500">Setup is a short form you fill out in your browser.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">That's it</div>
                <div className="text-gray-500">Once verified, future job earnings are deposited directly to your bank.</div>
              </div>
            </li>
          </ul>
        </div>
      )}

      {/* Current setup details — only show meaningful info when user has done at least some setup */}
      {(isActive || isIncomplete) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Your setup</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Payout method</dt>
              <dd className="text-gray-900 font-medium mt-0.5">
                {payoutMethodLabel || (
                  <span className="text-gray-400 italic">Not added yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium mt-0.5">
                {isActive ? (
                  <span className="inline-flex items-center text-green-700">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-700">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Incomplete
                  </span>
                )}
              </dd>
            </div>
            {status?.onboardedAt && (
              <div>
                <dt className="text-gray-500">Set up on</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{formatDate(status.onboardedAt)}</dd>
              </div>
            )}
            {status?.updatedAt && status.updatedAt !== status.onboardedAt && (
              <div>
                <dt className="text-gray-500">Last updated</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{formatDate(status.updatedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* "Why direct deposit" — soft pitch for users who haven't started */}
      {currentStatus === 'not_started' && (
        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100 rounded-xl p-5 sm:p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Why direct deposit?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <BoltIcon className="h-6 w-6 text-blue-600 mb-1" />
              <div className="font-medium text-gray-900">Faster</div>
              <div className="text-gray-600">The quickest way to receive your earnings.</div>
            </div>
            <div>
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 mb-1" />
              <div className="font-medium text-gray-900">Secure</div>
              <div className="text-gray-600">Bank info is encrypted and never stored on our servers.</div>
            </div>
            <div>
              <ArrowPathIcon className="h-6 w-6 text-blue-600 mb-1" />
              <div className="font-medium text-gray-900">Flexible</div>
              <div className="text-gray-600">Update your bank account anytime from this page.</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer note: security + W-9 clarification */}
      <p className="text-xs text-gray-500">
        Payout setup is powered by our payments partner, <span className="font-medium text-gray-700">Trolley</span>.
        Your bank information is encrypted and stored only with them — never on our servers.
        Tax forms (W-9) are collected separately as part of your interpreter profile.
      </p>

      {/* Widget modal */}
      {widgetUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Direct deposit setup</h3>
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
