import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    if (config.data) {
      console.log('Request Data:', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.response?.data?.message) {
      if (error.response.data.errors) {
        // Format validation errors
        const errorMessages = error.response.data.errors.map(err => 
          `${err.path}: ${err.msg}`
        ).join(', ');
        throw new Error(`Validation errors: ${errorMessages}`);
      }
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'An unexpected error occurred');
  }
);

// API endpoints
export const applicationAPI = {
  // Submit application
  submit: (data) => api.post('/applications/submit', data),
  
  // Get application status
  getStatus: (applicationId) => api.get(`/applications/${applicationId}/status`),
  
  // Upload document
  uploadDocument: (applicationId, formData) => {
    return api.post(`/applications/${applicationId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Interpreter API
export const interpreterAPI = {
  // Create interpreter profile (with file uploads)
  createProfile: (profileData) => {
    return api.post('/interpreters', profileData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get interpreter profile
  getProfile: (interpreterId) => {
    return api.get(`/interpreters/${interpreterId}`);
  },

  // Update interpreter profile
  updateProfile: (interpreterId, profileData) => {
    return api.put(`/interpreters/${interpreterId}`, profileData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get all interpreters (with filters)
  getAll: (params = {}) => {
    return api.get('/interpreters', { params });
  },
};

// Parametric Data API
export const parametricAPI = {
  // Get all parametric data
  getAllParametricData: () => {
    return api.get('/parametric/all');
  },

  // Get languages
  getLanguages: () => {
    return api.get('/parametric/languages');
  },

  // Get service types
  getServiceTypes: () => {
    return api.get('/parametric/service-types');
  },

  // Get certificate types
  getCertificateTypes: () => {
    return api.get('/parametric/certificate-types');
  },

  // Get US states
  getUSStates: () => {
    return api.get('/parametric/us-states');
  },
};

// Address API
export const addressAPI = {
  // Validate address
  validateAddress: (addressData) => {
    return api.post('/address/validate', addressData);
  },

  // Get address suggestions
  getSuggestions: (input, sessionToken = null) => {
    return api.get('/address/suggestions', {
      params: { input, session_token: sessionToken }
    });
  },

  // Get place details
  getPlaceDetails: (placeId) => {
    return api.get(`/address/place/${placeId}`);
  },

  // Geocode address
  geocodeAddress: (address) => {
    return api.post('/address/geocode', { address });
  },
};

export default api;