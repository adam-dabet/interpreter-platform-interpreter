/**
 * Provider-facing job status display.
 * Once an interpreter has been paid, later admin workflow statuses
 * (e.g. billed, closed) should not replace "Paid" in the portal.
 */

export const isJobPaidToInterpreter = (job) =>
  Boolean(job?.interpreter_paid_at) || job?.status === 'interpreter_paid';

/** Assigned to interpreter — includes reminders_sent (internal admin step after reminders). */
export const isProviderAssignedJob = (job) =>
  job?.status === 'assigned' ||
  job?.status === 'reminders_sent' ||
  (job?.assignment_status === 'accepted' && job?.assigned_interpreter_id);

export const getProviderJobStatusLabel = (job) => {
  if (!job) return 'Unknown';
  if (isJobPaidToInterpreter(job)) return 'Paid';

  const status = job.status;
  if (!status) return 'Unknown';

  switch (status) {
    case 'assigned':
    case 'reminders_sent':
      return 'Assigned';
    case 'interpreter_paid':
      return 'Paid';
    case 'billed':
      return 'Billed';
    case 'closed':
      return 'Closed';
    case 'completion_report':
      return 'Report Submitted';
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    default:
      return status.replace(/_/g, ' ');
  }
};

export const getProviderJobStatusBadgeClasses = (job) => {
  if (isJobPaidToInterpreter(job)) {
    return 'bg-green-100 text-green-800 border border-green-200';
  }

  switch (job?.status) {
    case 'assigned':
    case 'reminders_sent':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'interpreter_paid':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'billed':
    case 'closed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'completion_report':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'completed':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
};
