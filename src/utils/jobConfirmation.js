/**
 * Interpreter-facing availability confirmation (assignment offer vs post-assignment confirm).
 */

export function jobNeedsAvailabilityConfirmation(job) {
  if (!job) return false;
  if (job.assignment_status === 'pending_confirmation') return true;
  if (job.status === 'assigned' && job.confirmation_status === 'pending') return true;
  // Accepted assignment that hasn't yet done the initial availability confirmation
  if (
    (job.assignment_status === 'accepted' || job.status === 'assigned') &&
    !job.initial_confirmation_at &&
    !job.confirmed_at &&
    job.confirmation_status !== 'confirmed'
  ) {
    return true;
  }
  return false;
}

/** Confirmed step for progress UI — includes assignment-confirmed and availability-confirmed. */
export function jobAvailabilityConfirmed(job) {
  if (!job) return false;
  if (job.assignment_status === 'confirmed') return true;
  if (job.confirmed_at) return true;
  if (job.confirmation_status === 'confirmed') return true;
  return false;
}
