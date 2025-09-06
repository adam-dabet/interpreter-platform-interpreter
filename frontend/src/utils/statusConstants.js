// Centralized Status Constants for Interpreter Platform
// This file contains all status definitions used across Customer Portal, Admin Dashboard, and Interpreter Portal

// Job Status Options (job_status_enum)
export const JOB_STATUSES = {
  OPEN: 'open',
  ASSIGNED: 'assigned', 
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  PENDING_AUTHORIZATION: 'pending_authorization'
};

// Workflow Status Options (workflow_status)
export const WORKFLOW_STATUSES = {
  ASSIGNED: 'assigned',
  STARTED: 'started',
  COMPLETED: 'completed', 
  REPORTED: 'reported',
  AUTHORIZED: 'authorized',
  BILLED: 'billed',
  PAID: 'paid'
};

// Assignment Status Options (assignment_status_enum)
export const ASSIGNMENT_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Status Labels for Display
export const JOB_STATUS_LABELS = {
  [JOB_STATUSES.OPEN]: 'Open',
  [JOB_STATUSES.ASSIGNED]: 'Assigned',
  [JOB_STATUSES.IN_PROGRESS]: 'In Progress',
  [JOB_STATUSES.COMPLETED]: 'Completed',
  [JOB_STATUSES.CANCELLED]: 'Cancelled',
  [JOB_STATUSES.NO_SHOW]: 'No Show',
  [JOB_STATUSES.PENDING_AUTHORIZATION]: 'Pending Authorization'
};

export const WORKFLOW_STATUS_LABELS = {
  [WORKFLOW_STATUSES.ASSIGNED]: 'Assigned',
  [WORKFLOW_STATUSES.STARTED]: 'Started',
  [WORKFLOW_STATUSES.COMPLETED]: 'Completed',
  [WORKFLOW_STATUSES.REPORTED]: 'Reported',
  [WORKFLOW_STATUSES.AUTHORIZED]: 'Authorized',
  [WORKFLOW_STATUSES.BILLED]: 'Billed',
  [WORKFLOW_STATUSES.PAID]: 'Paid'
};

export const ASSIGNMENT_STATUS_LABELS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'Pending',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'Accepted',
  [ASSIGNMENT_STATUSES.DECLINED]: 'Declined',
  [ASSIGNMENT_STATUSES.COMPLETED]: 'Completed',
  [ASSIGNMENT_STATUSES.CANCELLED]: 'Cancelled'
};

// Status Colors (Tailwind CSS classes)
export const JOB_STATUS_COLORS = {
  [JOB_STATUSES.OPEN]: 'text-green-600 bg-green-100',
  [JOB_STATUSES.ASSIGNED]: 'text-blue-600 bg-blue-100',
  [JOB_STATUSES.IN_PROGRESS]: 'text-yellow-600 bg-yellow-100',
  [JOB_STATUSES.COMPLETED]: 'text-purple-600 bg-purple-100',
  [JOB_STATUSES.CANCELLED]: 'text-red-600 bg-red-100',
  [JOB_STATUSES.NO_SHOW]: 'text-orange-600 bg-orange-100',
  [JOB_STATUSES.PENDING_AUTHORIZATION]: 'text-amber-600 bg-amber-100'
};

export const WORKFLOW_STATUS_COLORS = {
  [WORKFLOW_STATUSES.ASSIGNED]: 'text-blue-600 bg-blue-100',
  [WORKFLOW_STATUSES.STARTED]: 'text-green-600 bg-green-100',
  [WORKFLOW_STATUSES.COMPLETED]: 'text-orange-600 bg-orange-100',
  [WORKFLOW_STATUSES.REPORTED]: 'text-purple-600 bg-purple-100',
  [WORKFLOW_STATUSES.AUTHORIZED]: 'text-indigo-600 bg-indigo-100',
  [WORKFLOW_STATUSES.BILLED]: 'text-yellow-600 bg-yellow-100',
  [WORKFLOW_STATUSES.PAID]: 'text-emerald-600 bg-emerald-100'
};

export const ASSIGNMENT_STATUS_COLORS = {
  [ASSIGNMENT_STATUSES.PENDING]: 'text-yellow-600 bg-yellow-100',
  [ASSIGNMENT_STATUSES.ACCEPTED]: 'text-green-600 bg-green-100',
  [ASSIGNMENT_STATUSES.DECLINED]: 'text-red-600 bg-red-100',
  [ASSIGNMENT_STATUSES.COMPLETED]: 'text-blue-600 bg-blue-100',
  [ASSIGNMENT_STATUSES.CANCELLED]: 'text-gray-600 bg-gray-100'
};

// Status Options for Dropdowns/Selects
export const JOB_STATUS_OPTIONS = [
  { value: 'all', label: 'All Appointments' },
  { value: JOB_STATUSES.OPEN, label: JOB_STATUS_LABELS[JOB_STATUSES.OPEN] },
  { value: JOB_STATUSES.ASSIGNED, label: JOB_STATUS_LABELS[JOB_STATUSES.ASSIGNED] },
  { value: JOB_STATUSES.IN_PROGRESS, label: JOB_STATUS_LABELS[JOB_STATUSES.IN_PROGRESS] },
  { value: JOB_STATUSES.COMPLETED, label: JOB_STATUS_LABELS[JOB_STATUSES.COMPLETED] },
  { value: JOB_STATUSES.CANCELLED, label: JOB_STATUS_LABELS[JOB_STATUSES.CANCELLED] },
  { value: JOB_STATUSES.NO_SHOW, label: JOB_STATUS_LABELS[JOB_STATUSES.NO_SHOW] },
  { value: JOB_STATUSES.PENDING_AUTHORIZATION, label: JOB_STATUS_LABELS[JOB_STATUSES.PENDING_AUTHORIZATION] }
];

// Helper Functions
export const getJobStatusColor = (status) => {
  return JOB_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
};

export const getWorkflowStatusColor = (status) => {
  return WORKFLOW_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
};

export const getAssignmentStatusColor = (status) => {
  return ASSIGNMENT_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
};

export const getJobStatusLabel = (status) => {
  return JOB_STATUS_LABELS[status] || status;
};

export const getWorkflowStatusLabel = (status) => {
  return WORKFLOW_STATUS_LABELS[status] || status;
};

export const getAssignmentStatusLabel = (status) => {
  return ASSIGNMENT_STATUS_LABELS[status] || status;
};

// Status Categories
export const FINISHED_JOB_STATUSES = [
  JOB_STATUSES.COMPLETED,
  JOB_STATUSES.CANCELLED,
  JOB_STATUSES.NO_SHOW
];

export const ACTIVE_JOB_STATUSES = [
  JOB_STATUSES.OPEN,
  JOB_STATUSES.ASSIGNED,
  JOB_STATUSES.IN_PROGRESS,
  JOB_STATUSES.PENDING_AUTHORIZATION
];

// Check if a job status allows re-requesting
export const canReRequestJob = (status) => {
  return FINISHED_JOB_STATUSES.includes(status);
};
