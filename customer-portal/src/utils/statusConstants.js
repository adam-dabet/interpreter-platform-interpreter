// Customer Portal Status Constants
// Customer-relevant statuses only (admin-only statuses filtered out)

// Primary Job Status Flow (customer-visible statuses only)
export const JOB_STATUSES = {
  // Customer initiated
  REQUESTED: 'requested',                    // 1. Requested by customer
  
  // System/Interpreter actions
  FINDING_INTERPRETER: 'finding_interpreter', // 2. Finding interpreter (sent to interpreters)
  ASSIGNED: 'assigned',                      // 3. Assigned (interpreter found)
  
  // Job execution
  IN_PROGRESS: 'in_progress',               // 4. In progress (appointment happening)
  COMPLETED: 'completed',                   // 5. Completed (job complete)
  
  // Post-completion workflow (customer-relevant only)
  BILLED: 'billed',                        // 6. Billed (customer billed)
  CLOSED: 'closed',                        // 7. Closed (job closed)
  
  // Additional statuses for edge cases
  CANCELLED: 'cancelled',                   // Job cancelled
  NO_SHOW: 'no_show',                      // No show occurred
  REJECTED: 'rejected'                     // Rejected by admin
};

// Admin-only statuses (not shown to customers)
export const ADMIN_ONLY_STATUSES = {
  REMINDERS_SENT: 'reminders_sent',         // 5. Reminders sent (admin internal)
  COMPLETION_REPORT: 'completion_report',   // 8. Completion report (interpreter fills report)
  INTERPRETER_PAID: 'interpreter_paid',     // 11. Interpreter has been paid (admin internal)
};

// Assignment Status (how interpreters respond to job offers)
export const ASSIGNMENT_STATUSES = {
  PENDING: 'pending',       // Waiting for interpreter response
  ACCEPTED: 'accepted',     // Interpreter accepted
  DECLINED: 'declined',     // Interpreter declined
  EXPIRED: 'expired'        // Assignment offer expired
};

// Status Labels for Display (customer-visible only)
export const JOB_STATUS_LABELS = {
  [JOB_STATUSES.REQUESTED]: 'Requested',
  [JOB_STATUSES.FINDING_INTERPRETER]: 'Finding Interpreter',
  [JOB_STATUSES.ASSIGNED]: 'Assigned',
  [JOB_STATUSES.IN_PROGRESS]: 'In Progress',
  [JOB_STATUSES.COMPLETED]: 'Completed',
  [JOB_STATUSES.BILLED]: 'Billed',
  [JOB_STATUSES.CLOSED]: 'Closed',
  [JOB_STATUSES.CANCELLED]: 'Cancelled',
  [JOB_STATUSES.NO_SHOW]: 'No Show',
  [JOB_STATUSES.REJECTED]: 'Rejected'
};

export const ASSIGNMENT_STATUS_LABELS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'Pending',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'Accepted',
  [ASSIGNMENT_STATUSES.DECLINED]: 'Declined',
  [ASSIGNMENT_STATUSES.EXPIRED]: 'Expired'
};

// Status Colors (Tailwind CSS classes) - customer-visible only
export const JOB_STATUS_COLORS = {
  [JOB_STATUSES.REQUESTED]: 'text-blue-600 bg-blue-100',
  [JOB_STATUSES.FINDING_INTERPRETER]: 'text-yellow-600 bg-yellow-100',
  [JOB_STATUSES.ASSIGNED]: 'text-indigo-600 bg-indigo-100',
  [JOB_STATUSES.IN_PROGRESS]: 'text-orange-600 bg-orange-100',
  [JOB_STATUSES.COMPLETED]: 'text-teal-600 bg-teal-100',
  [JOB_STATUSES.BILLED]: 'text-emerald-600 bg-emerald-100',
  [JOB_STATUSES.CLOSED]: 'text-gray-600 bg-gray-100',
  [JOB_STATUSES.CANCELLED]: 'text-red-600 bg-red-100',
  [JOB_STATUSES.NO_SHOW]: 'text-orange-700 bg-orange-200',
  [JOB_STATUSES.REJECTED]: 'text-red-700 bg-red-200'
};

export const ASSIGNMENT_STATUS_COLORS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'text-yellow-600 bg-yellow-100',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'text-green-600 bg-green-100',
  [ASSIGNMENT_STATUSES.DECLINED]: 'text-red-600 bg-red-100',
  [ASSIGNMENT_STATUSES.EXPIRED]: 'text-gray-600 bg-gray-100'
};

// Customer sees relevant statuses for their perspective (admin-only statuses removed)
export const JOB_STATUS_OPTIONS = [
  { value: 'all', label: 'All Appointments' },
  { value: JOB_STATUSES.FINDING_INTERPRETER, label: 'Finding Interpreter' },
  { value: JOB_STATUSES.ASSIGNED, label: 'Interpreter Assigned' },
  { value: JOB_STATUSES.IN_PROGRESS, label: 'In Progress' },
  { value: JOB_STATUSES.COMPLETED, label: 'Completed' },
  { value: JOB_STATUSES.BILLED, label: 'Billed' },
  { value: JOB_STATUSES.CLOSED, label: 'Closed' },
  { value: JOB_STATUSES.CANCELLED, label: 'Cancelled' },
  { value: JOB_STATUSES.NO_SHOW, label: 'No Show' }
];

// Status Categories (customer-visible only)
export const ACTIVE_JOB_STATUSES = [
  JOB_STATUSES.REQUESTED,
  JOB_STATUSES.FINDING_INTERPRETER,
  JOB_STATUSES.ASSIGNED,
  JOB_STATUSES.IN_PROGRESS
];

export const COMPLETED_JOB_STATUSES = [
  JOB_STATUSES.COMPLETED,
  JOB_STATUSES.BILLED,
  JOB_STATUSES.CLOSED
];

export const FINISHED_JOB_STATUSES = [
  ...COMPLETED_JOB_STATUSES,
  JOB_STATUSES.CANCELLED,
  JOB_STATUSES.NO_SHOW,
  JOB_STATUSES.REJECTED
];

// Helper Functions
export const getJobStatusColor = (status) => {
  return JOB_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
};

export const getAssignmentStatusColor = (status) => {
  return ASSIGNMENT_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
};

// Map admin-only statuses to customer-visible statuses
export const mapStatusForCustomer = (status) => {
  const adminOnlyMapping = {
    [ADMIN_ONLY_STATUSES.REMINDERS_SENT]: JOB_STATUSES.ASSIGNED, // Show as "Assigned" to customer
    [ADMIN_ONLY_STATUSES.COMPLETION_REPORT]: JOB_STATUSES.COMPLETED, // Show as "Completed" to customer
    [ADMIN_ONLY_STATUSES.INTERPRETER_PAID]: JOB_STATUSES.CLOSED // Show as "Closed" to customer
  };
  
  return adminOnlyMapping[status] || status;
};

export const getJobStatusLabel = (status) => {
  const customerStatus = mapStatusForCustomer(status);
  return JOB_STATUS_LABELS[customerStatus] || customerStatus;
};

export const getAssignmentStatusLabel = (status) => {
  return ASSIGNMENT_STATUS_LABELS[status] || status;
};

// Check if a job status allows re-requesting
export const canReRequestJob = (status) => {
  return FINISHED_JOB_STATUSES.includes(status);
};

// Customer-specific helper functions
export const canCustomerCancelAppointment = (status) => {
  return [
    JOB_STATUSES.REQUESTED,
    JOB_STATUSES.FINDING_INTERPRETER,
    JOB_STATUSES.ASSIGNED
  ].includes(status);
};

export const canCustomerModifyAppointment = (status) => {
  return [
    JOB_STATUSES.REQUESTED
  ].includes(status);
};

export const isAppointmentConfirmed = (status) => {
  return [
    JOB_STATUSES.ASSIGNED,
    JOB_STATUSES.REMINDERS_SENT,
    JOB_STATUSES.IN_PROGRESS,
    JOB_STATUSES.COMPLETED,
    JOB_STATUSES.COMPLETION_REPORT,
    JOB_STATUSES.BILLED,
    JOB_STATUSES.CLOSED,
    JOB_STATUSES.INTERPRETER_PAID
  ].includes(status);
};

export const isBillableStatus = (status) => {
  return [
    JOB_STATUSES.COMPLETION_REPORT,
    JOB_STATUSES.BILLED,
    JOB_STATUSES.CLOSED,
    JOB_STATUSES.INTERPRETER_PAID
  ].includes(status);
};

// Get customer-friendly status messages
export const getCustomerStatusMessage = (status) => {
  const messages = {
    [JOB_STATUSES.REQUESTED]: 'Your appointment request is being reviewed',
    [JOB_STATUSES.FINDING_INTERPRETER]: 'We are finding an interpreter for you',
    [JOB_STATUSES.ASSIGNED]: 'An interpreter has been assigned to your appointment',
    [JOB_STATUSES.REMINDERS_SENT]: 'Reminders have been sent for your upcoming appointment',
    [JOB_STATUSES.IN_PROGRESS]: 'Your appointment is currently in progress',
    [JOB_STATUSES.COMPLETED]: 'Your appointment has been completed',
    [JOB_STATUSES.COMPLETION_REPORT]: 'Your appointment is being finalized',
    [JOB_STATUSES.BILLED]: 'You have been billed for this appointment',
    [JOB_STATUSES.CLOSED]: 'Your appointment is complete',
    [JOB_STATUSES.INTERPRETER_PAID]: 'Your appointment is fully complete',
    [JOB_STATUSES.CANCELLED]: 'This appointment was cancelled',
    [JOB_STATUSES.NO_SHOW]: 'No show was recorded for this appointment',
    [JOB_STATUSES.REJECTED]: 'Your appointment request was not approved'
  };

  return messages[status] || JOB_STATUS_LABELS[status] || status;
};

// Backward compatibility exports
export const WORKFLOW_STATUSES = JOB_STATUSES;
export const WORKFLOW_STATUS_LABELS = JOB_STATUS_LABELS;
export const WORKFLOW_STATUS_COLORS = JOB_STATUS_COLORS;
export const getWorkflowStatusColor = getJobStatusColor;
export const getWorkflowStatusLabel = getJobStatusLabel;