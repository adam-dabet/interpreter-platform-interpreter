import api from './api';

const jobAPI = {
  getAvailableJobs: (params = {}) => api.get('/jobs/available', { params }),
  getMyJobs: (params = {}) => api.get('/jobs/my-jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  acceptJob: (jobId, data = {}) => api.post(`/jobs/${jobId}/accept`, data),
  declineJob: (jobId, data = {}) => api.post(`/jobs/${jobId}/decline`, data),
  unassignJob: (jobId, data = {}) => api.post(`/jobs/${jobId}/unassign`, data),
  confirmAvailability: (jobId, data = {}) => api.post(`/jobs/${jobId}/confirm-availability`, data),
  // New availability indication methods
  indicateAvailability: (jobId, mileage_requested = 0, team_member_id = null) => api.post(`/jobs/${jobId}/indicate-available`, { mileage_requested, team_member_id }),
  indicateNotAvailable: (jobId, reason = '') => api.post(`/jobs/${jobId}/indicate-not-available`, { reason }),
  startJob: (jobId, locationData = {}) => api.post(`/interpreters/jobs/${jobId}/start`, locationData),
  endJob: (jobId) => api.post(`/interpreters/jobs/${jobId}/end`),
  submitCompletionReport: (jobId, reportData) => api.post(`/jobs/${jobId}/completion-report`, reportData),
  getEarnings: (params = {}) => api.get('/interpreters/earnings', { params }),
  getPaymentCalculation: (jobId) => api.get(`/interpreters/jobs/${jobId}/payment-calculation`),
};

export default jobAPI;
