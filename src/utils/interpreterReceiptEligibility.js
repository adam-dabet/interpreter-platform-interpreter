/**
 * Receipt vs invoice tracking for interpreter payment (mirrors admin/backend logic).
 * Confirmation receipts are only sent for self-registered interpreters
 * on jobs completed after they registered on the portal.
 */

import { isJobPaidToInterpreter, isProviderJobCompleted } from './providerJobStatus';

const getInterpreterRegistrationSource = (job, interpreter) =>
  interpreter?.registration_source ?? job?.interpreter_registration_source;

const getInterpreterRegisteredAt = (job, interpreter) =>
  interpreter?.signup_token_used_at ??
  interpreter?.created_at ??
  job?.interpreter_signup_token_used_at ??
  job?.interpreter_created_at;

export function jobRequiresReceipt(job, interpreter = null) {
  if (getInterpreterRegistrationSource(job, interpreter) !== 'self_registered') return false;

  const registeredAt = getInterpreterRegisteredAt(job, interpreter);
  if (!registeredAt) return false;

  const completedAt = job?.completion_report_at || job?.completion_report_submitted_at;
  if (!completedAt) return false;

  return new Date(completedAt) >= new Date(registeredAt);
}

export function usesInvoiceTrackingFlow(job, interpreter = null) {
  return !jobRequiresReceipt(job, interpreter);
}

/** Job completed before the interpreter registered on the portal (self-registered, invoice flow). */
export function isPreRegistrationCompletedJob(job, interpreter = null) {
  return (
    getInterpreterRegistrationSource(job, interpreter) === 'self_registered' &&
    usesInvoiceTrackingFlow(job, interpreter)
  );
}

export function isJobEligibleForProviderPaymentNotice(job) {
  return Boolean(
    job?.completion_report_submitted ||
      job?.completion_report_at ||
      job?.completion_report_data ||
      isProviderJobCompleted(job)
  );
}

/** Provider must submit an invoice before admin can process payment. */
export function jobNeedsProviderInvoice(job, interpreter = null) {
  if (isJobPaidToInterpreter(job)) return false;
  if (!isJobEligibleForProviderPaymentNotice(job)) return false;
  if (jobRequiresReceipt(job, interpreter)) return false;
  if (job?.interpreter_invoice_received_at) return false;
  return usesInvoiceTrackingFlow(job, interpreter);
}

/** Invoice received by admin; payment not yet marked interpreter_paid. */
export function isProviderInvoiceAwaitingPayment(job, interpreter = null) {
  if (isJobPaidToInterpreter(job)) return false;
  if (!isJobEligibleForProviderPaymentNotice(job)) return false;
  if (jobRequiresReceipt(job, interpreter)) return false;
  if (!job?.interpreter_invoice_received_at) return false;
  return usesInvoiceTrackingFlow(job, interpreter);
}
