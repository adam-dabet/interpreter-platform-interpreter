import axios from 'axios';

// Determine API base URL
// In production, if REACT_APP_API_URL is not set, try to infer from the current hostname
const getApiBaseURL = () => {
  // If explicitly set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production, try to detect the backend URL based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're on providers.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'providers.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on admin.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'admin.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on portal.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'portal.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on a Railway domain, try to infer backend URL
    if (hostname.includes('.up.railway.app')) {
      // For Railway deployments, try to construct backend URL
      // This is a fallback - REACT_APP_API_URL should be set in Railway
      return '/api';
    }
  }
  
  // Default fallback for local development
  return '/api';
};

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [
    function (data) {
      // Check if response is HTML before trying to parse as JSON
      if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')) {
        throw new Error('HTML response received instead of JSON. This usually indicates a server error or 404 page.');
      }
      // Try to parse JSON, but handle errors gracefully
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          // If parsing fails and it's not HTML, it might be plain text
          // Let axios handle it normally
          if (data.trim().startsWith('<')) {
            throw new Error('HTML response received instead of JSON. The server may have returned an error page.');
          }
          return data;
        }
      }
      return data;
    }
  ],
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
    // Check if response is HTML instead of JSON (common with 404/500 error pages)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON:', response.request?.responseURL);
      throw new Error('Server returned an error page. Please check that the API endpoint is correct and the server is running.');
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Check if error is due to HTML response being parsed as JSON
    if (error.message && (error.message.includes('Unexpected token') || error.message.includes('<!DOCTYPE'))) {
      const url = error.config?.url || error.request?.responseURL || 'unknown endpoint';
      console.error('HTML response received instead of JSON from:', url);
      return Promise.reject(new Error('Server returned an error page instead of JSON. This usually means the API endpoint was not found (404) or the server encountered an error. Please contact support if this persists.'));
    }
    
    // Check if response data is HTML
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<!DOCTYPE')) {
      const status = error.response.status;
      const statusText = error.response.statusText || 'Unknown Error';
      console.error(`HTML error page received (${status} ${statusText}):`, error.config?.url);
      
      if (status === 404) {
        return Promise.reject(new Error('The requested API endpoint was not found. Please verify the server is running and the endpoint is correct.'));
      } else if (status >= 500) {
        return Promise.reject(new Error('Server error occurred. The server may be down or experiencing issues. Please try again later or contact support.'));
      } else {
        return Promise.reject(new Error(`Server error (${status} ${statusText}). Please contact support if this persists.`));
      }
    }
    
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
    
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      if (error.message.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and verify the server is accessible.');
      }
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

  // Lookup interpreter by email and send registration link
  lookupByEmail: (email) => {
    return api.post('/interpreters/lookup-by-email', { email });
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