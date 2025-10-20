import api from './api';

const jobAPI = {
  // Get available jobs (for interpreters to browse)
  getAvailableJobs: (params = {}) => {
    return api.get('/jobs/available', { params });
  },

  // Get interpreter's jobs (their assignments)
  getMyJobs: (params = {}) => {
    return api.get('/jobs/my-jobs', { params });
  },

  // Get interpreter's earnings
  getEarnings: (params = {}) => {
    return api.get('/jobs/earnings', { params });
  },

  // Accept a job
  acceptJob: (jobId, data = {}) => {
    return api.post(`/jobs/${jobId}/accept`, data);
  },

  // Decline a job
  declineJob: (jobId, data = {}) => {
    return api.post(`/jobs/${jobId}/decline`, data);
  },

  // Unassign from a job (only if 24+ hours away)
  unassignJob: (jobId, data = {}) => {
    return api.post(`/jobs/${jobId}/unassign`, data);
  },

  // Confirm availability for a job after schedule change
  confirmAvailability: (jobId, data = {}) => {
    return api.post(`/jobs/${jobId}/confirm-availability`, data);
  },

  // Complete a job (now triggers completion report)
  completeJob: (jobId) => {
    // This will now open the completion report form instead of directly completing
    return Promise.resolve({ success: true, message: 'Opening completion report form' });
  },

  // Start a job (authenticated interpreter)
  startJob: (jobId) => {
    return api.post(`/interpreters/jobs/${jobId}/start`);
  },

  // End a job (authenticated interpreter)
  endJob: (jobId) => {
    return api.post(`/interpreters/jobs/${jobId}/end`);
  },

  // Admin: Get all jobs
  getAllJobs: (params = {}) => {
    return api.get('/jobs', { params });
  },

  // Admin: Get job statistics
  getJobStats: () => {
    return api.get('/jobs/stats');
  },

  // Admin: Create a new job
  createJob: (data) => {
    return api.post('/jobs', data);
  },

  // Admin: Get a specific job
  getJobById: (id) => {
    return api.get(`/jobs/${id}`);
  },

  // Admin: Update a job
  updateJob: (id, data) => {
    return api.put(`/jobs/${id}`, data);
  },

  // Admin: Delete a job
  deleteJob: (id) => {
    return api.delete(`/jobs/${id}`);
  },

  // Admin: Assign a job to an interpreter
  assignJobToInterpreter: (jobId, data) => {
    return api.post(`/jobs/${jobId}/assign`, data);
  },

  // Admin: Get job assignments
  getJobAssignments: (jobId, params = {}) => {
    return api.get(`/jobs/${jobId}/assignments`, { params });
  }
};

export default jobAPI;



