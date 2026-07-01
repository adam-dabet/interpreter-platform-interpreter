import React from 'react';
import { DocumentTextIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  isPreRegistrationCompletedJob,
  jobNeedsProviderInvoice,
  isProviderInvoiceAwaitingPayment,
} from '../utils/interpreterReceiptEligibility';

export const PROVIDER_AP_EMAIL = 'AP@theintegritycompanyinc.com';

const ProviderInvoiceNotice = ({ job, profile, compact = false }) => {
  const needsInvoice = jobNeedsProviderInvoice(job, profile);
  const awaitingPayment = isProviderInvoiceAwaitingPayment(job, profile);

  if (!needsInvoice && !awaitingPayment) return null;

  if (awaitingPayment) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-blue-50 border border-blue-200 rounded-lg`}>
        <div className="flex items-start gap-3">
          <ClockIcon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600 flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-blue-900`}>
              Invoice Received — Payment Processing
            </p>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-blue-800 mt-1`}>
              We have received your invoice for this job. Payment will be processed once approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const preRegistration = isPreRegistrationCompletedJob(job, profile);

  return (
    <div className={`${compact ? 'p-3' : 'p-4'} bg-amber-50 border border-amber-200 rounded-lg`}>
      <div className="flex items-start gap-3">
        <DocumentTextIcon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-amber-700 flex-shrink-0 mt-0.5`} />
        <div className="space-y-2">
          <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-amber-900`}>
            Invoice Required for Payment
          </p>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-amber-900`}>
            {preRegistration
              ? 'This job was completed before you registered on the portal. Please submit an invoice to receive payment — a confirmation receipt is not sent for these jobs.'
              : 'Please submit an invoice for this job to receive payment.'}
          </p>
          {!compact && (
            <>
              <p className="text-sm text-amber-900 font-medium">Each invoice must include:</p>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-0.5">
                {job?.job_number && <li>Job number: {job.job_number}</li>}
                <li>Date of service</li>
                <li>Start and end time of service</li>
                <li>Total hours billed</li>
              </ul>
            </>
          )}
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-amber-900 flex items-center gap-1.5 flex-wrap`}>
            <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
            <span>Send to</span>
            <a
              href={`mailto:${PROVIDER_AP_EMAIL}?subject=Invoice%20for%20Job%20${encodeURIComponent(job?.job_number || '')}`}
              className="font-medium text-amber-950 underline hover:text-amber-800"
            >
              {PROVIDER_AP_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderInvoiceNotice;
