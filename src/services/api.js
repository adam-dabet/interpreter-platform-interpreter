import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('interpreterToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Adding auth token to request:', config.url);
    } else {
      console.log('⚠️ No auth token found for request:', config.url);
    }
    return config;
  },
  (error) => {
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



// Generic API call function
export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await api({
      url: endpoint,
      ...options,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Auth API
export const authAPI = {
  // Interpreter login
  interpreterLogin: (credentials) => {
    return api.post('/auth/interpreter/login', credentials);
  },
  
  // Admin login
  adminLogin: (credentials) => {
    return api.post('/auth/login', credentials);
  },
  
  // Logout
  logout: () => {
    return api.post('/auth/logout');
  },
  
  // Get profile
  getProfile: () => {
    return api.get('/auth/profile');
  },
  
  // Change password
  changePassword: (passwordData) => {
    return api.post('/auth/change-password', passwordData);
  },
  
  // Forgot password
  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email });
  },
  
  // Reset password
  resetPassword: (tokenData) => {
    return api.post('/auth/reset-password', tokenData);
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
  getProfile: () => {
    return api.get('/interpreters/profile');
  },
  
  // Update interpreter profile (direct update - deprecated in favor of update approval workflow)
  updateProfile: (profileData) => {
    return api.put('/interpreters/profile', profileData);
  },
  
  // Submit profile update (requires admin approval)
  submitProfileUpdate: (profileData) => {
    return api.post('/interpreters/profile/update', profileData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get pending profile update
  getPendingUpdate: () => {
    return api.get('/interpreters/profile/pending-update');
  },
  
  // Cancel pending profile update
  cancelPendingUpdate: () => {
    return api.delete('/interpreters/profile/pending-update');
  },
  
  // Agency member management
  getAgencyMembers: () => {
    return api.get('/interpreters/agency-members');
  },

  createTeamMember: (memberData) => {
    return api.post('/interpreters/agency-members/create', memberData);
  },

  removeAgencyMember: (memberId) => {
    return api.delete(`/interpreters/agency-members/${memberId}`);
  },
};

// Parametric Data API
export const parametricAPI = {
  // Get all parametric data
  getAllParametricData: () => {
    return api.get('/parametric/all');
  },


};



export default api;