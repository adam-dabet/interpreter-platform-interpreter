import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('interpreterToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
);

const referralAPI = {
  createReferral: async (email, name) => {
    const response = await api.post('/referrals', { email, name });
    return response.data;
  },

  getMyReferrals: async () => {
    const response = await api.get('/referrals/my-referrals');
    return response.data;
  },

  getReferralStats: async () => {
    const response = await api.get('/referrals/stats');
    return response.data;
  },

  getMyReferralCode: async () => {
    const response = await api.get('/referrals/my-code');
    return response.data;
  },

  checkReferralCode: async (code) => {
    const response = await api.get(`/referrals/check-code/${code}`);
    return response.data;
  },

  linkReferralCode: async (code) => {
    const response = await api.post(`/referrals/link/${code}`);
    return response.data;
  }
};

export default referralAPI;
