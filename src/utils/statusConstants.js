// Interpreter Portal Status Constants
// Comprehensive status system for the 11-step workflow

// Primary Job Status Flow (matches the 10-step workflow)
export const JOB_STATUSES = {
  // Customer initiated
  REQUESTED: 'requested',                    // 1. Requested by customer
  
  // System/Interpreter actions
  FINDING_INTERPRETER: 'finding_interpreter', // 2. Finding interpreter (sent to interpreters)
  ASSIGNED: 'assigned',                      // 3. Assigned (interpreter found)
  REMINDERS_SENT: 'reminders_sent',         // 4. Reminders sent
  
  // Job execution
  IN_PROGRESS: 'in_progress',               // 5. In progress (appointment happening)
  COMPLETED: 'completed',                   // 6. Completed (job complete)
  
  // Post-completion workflow
  PAID: 'paid',                            // 7. Paid (interpreter has been paid)
  COMPLETION_REPORT: 'completion_report',   // 8. Completion report (interpreter fills report)
  BILLED: 'billed',                        // 8. Billed (customer billed)
  CLOSED: 'closed',                        // 9. Closed (job closed)
  INTERPRETER_PAID: 'interpreter_paid',     // 10. Interpreter has been paid
  
  // Additional statuses for edge cases
  CANCELLED: 'cancelled',                   // Job cancelled
  NO_SHOW: 'no_show',                      // No show occurred
  REJECTED: 'rejected'                     // Rejected by admin
};

// Assignment Status (how interpreters respond to job offers)
export const ASSIGNMENT_STATUSES = {
  PENDING: 'pending',       // Waiting for interpreter response
  ACCEPTED: 'accepted',     // Interpreter accepted
  DECLINED: 'declined',     // Interpreter declined
  EXPIRED: 'expired',       // Assignment offer expired
  PENDING_MILEAGE_APPROVAL: 'pending_mileage_approval'  // Mileage reimbursement pending admin approval
};

// Status Labels for Display
export const JOB_STATUS_LABELS = {
  [JOB_STATUSES.REQUESTED]: 'Requested',
  [JOB_STATUSES.FINDING_INTERPRETER]: 'Finding Interpreter',
  [JOB_STATUSES.ASSIGNED]: 'Assigned',
  [JOB_STATUSES.REMINDERS_SENT]: 'Reminders Sent',
  [JOB_STATUSES.IN_PROGRESS]: 'In Progress',
  [JOB_STATUSES.COMPLETED]: 'Completed',
  [JOB_STATUSES.PAID]: 'Paid',
  [JOB_STATUSES.COMPLETION_REPORT]: 'Completion Report',
  [JOB_STATUSES.BILLED]: 'Billed',
  [JOB_STATUSES.CLOSED]: 'Closed',
  [JOB_STATUSES.INTERPRETER_PAID]: 'Interpreter Paid',
  [JOB_STATUSES.CANCELLED]: 'Cancelled',
  [JOB_STATUSES.NO_SHOW]: 'No Show',
  [JOB_STATUSES.REJECTED]: 'Rejected'
};

export const ASSIGNMENT_STATUS_LABELS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'Pending',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'Accepted',
  [ASSIGNMENT_STATUSES.DECLINED]: 'Declined',
  [ASSIGNMENT_STATUSES.EXPIRED]: 'Expired',
  [ASSIGNMENT_STATUSES.PENDING_MILEAGE_APPROVAL]: 'Pending Mileage Approval'
};

// Status Colors (Tailwind CSS classes)
export const JOB_STATUS_COLORS = {
  [JOB_STATUSES.REQUESTED]: 'text-blue-600 bg-blue-100',
  [JOB_STATUSES.FINDING_INTERPRETER]: 'text-yellow-600 bg-yellow-100',
  [JOB_STATUSES.ASSIGNED]: 'text-indigo-600 bg-indigo-100',
  [JOB_STATUSES.REMINDERS_SENT]: 'text-purple-600 bg-purple-100',
  [JOB_STATUSES.IN_PROGRESS]: 'text-orange-600 bg-orange-100',
  [JOB_STATUSES.COMPLETED]: 'text-teal-600 bg-teal-100',
  [JOB_STATUSES.PAID]: 'text-green-700 bg-green-200',
  [JOB_STATUSES.COMPLETION_REPORT]: 'text-cyan-600 bg-cyan-100',
  [JOB_STATUSES.BILLED]: 'text-emerald-600 bg-emerald-100',
  [JOB_STATUSES.CLOSED]: 'text-gray-600 bg-gray-100',
  [JOB_STATUSES.INTERPRETER_PAID]: 'text-green-700 bg-green-200',
  [JOB_STATUSES.CANCELLED]: 'text-red-600 bg-red-100',
  [JOB_STATUSES.NO_SHOW]: 'text-orange-700 bg-orange-200',
  [JOB_STATUSES.REJECTED]: 'text-red-700 bg-red-200'
};

export const ASSIGNMENT_STATUS_COLORS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'text-yellow-600 bg-yellow-100',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'text-green-600 bg-green-100',
  [ASSIGNMENT_STATUSES.DECLINED]: 'text-red-600 bg-red-100',
  [ASSIGNMENT_STATUSES.EXPIRED]: 'text-gray-600 bg-gray-100',
  [ASSIGNMENT_STATUSES.PENDING_MILEAGE_APPROVAL]: 'text-orange-600 bg-orange-100'
};

// Interpreter sees relevant statuses for their perspective
export const JOB_STATUS_OPTIONS = [
  { value: 'all', label: 'All Jobs' },
  { value: JOB_STATUSES.FINDING_INTERPRETER, label: 'Available Jobs' },
  { value: JOB_STATUSES.ASSIGNED, label: 'My Assigned Jobs' },
  { value: JOB_STATUSES.IN_PROGRESS, label: 'In Progress' },
  { value: JOB_STATUSES.COMPLETED, label: 'Completed' },
  { value: JOB_STATUSES.PAID, label: 'Paid' },
  { value: JOB_STATUSES.COMPLETION_REPORT, label: 'Pending Report' },
  { value: JOB_STATUSES.CLOSED, label: 'Closed' },
  { value: JOB_STATUSES.INTERPRETER_PAID, label: 'Paid' },
  { value: JOB_STATUSES.CANCELLED, label: 'Cancelled' },
  { value: JOB_STATUSES.NO_SHOW, label: 'No Show' }
];

// Status Categories
export const ACTIVE_JOB_STATUSES = [
  JOB_STATUSES.REQUESTED,
  JOB_STATUSES.FINDING_INTERPRETER,
  JOB_STATUSES.ASSIGNED,
  JOB_STATUSES.REMINDERS_SENT,
  JOB_STATUSES.IN_PROGRESS
];

export const COMPLETED_JOB_STATUSES = [
  JOB_STATUSES.COMPLETED,
  JOB_STATUSES.PAID,
  JOB_STATUSES.COMPLETION_REPORT,
  JOB_STATUSES.BILLED,
  JOB_STATUSES.CLOSED,
  JOB_STATUSES.INTERPRETER_PAID
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

export const getJobStatusLabel = (status) => {
  return JOB_STATUS_LABELS[status] || status;
};

export const getAssignmentStatusLabel = (status) => {
  return ASSIGNMENT_STATUS_LABELS[status] || status;
};

// Check if a job status allows re-requesting
export const canReRequestJob = (status) => {
  return FINISHED_JOB_STATUSES.includes(status);
};

// Interpreter-specific helper functions
export const canInterpreterAcceptJob = (status) => {
  return status === JOB_STATUSES.FINDING_INTERPRETER;
};

export const canInterpreterStartJob = (status) => {
  return [JOB_STATUSES.ASSIGNED, JOB_STATUSES.REMINDERS_SENT].includes(status);
};

export const canInterpreterCompleteJob = (status) => {
  return status === JOB_STATUSES.IN_PROGRESS;
};

export const needsCompletionReport = (status) => {
  return status === JOB_STATUSES.COMPLETED;
};

export const isPayableToInterpreter = (status) => {
  return [
    JOB_STATUSES.COMPLETION_REPORT,
    JOB_STATUSES.BILLED,
    JOB_STATUSES.CLOSED,
    JOB_STATUSES.INTERPRETER_PAID
  ].includes(status);
};

// Backward compatibility exports
export const WORKFLOW_STATUSES = JOB_STATUSES;
export const WORKFLOW_STATUS_LABELS = JOB_STATUS_LABELS;
export const WORKFLOW_STATUS_COLORS = JOB_STATUS_COLORS;
export const getWorkflowStatusColor = getJobStatusColor;
export const getWorkflowStatusLabel = getJobStatusLabel;