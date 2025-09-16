import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth data on app load
    const storedToken = localStorage.getItem('customerToken');
    const storedRefreshToken = localStorage.getItem('customerRefreshToken');
    const storedCustomer = localStorage.getItem('customerData');

    if (storedToken && storedCustomer) {
      try {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setCustomer(JSON.parse(storedCustomer));
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        logout();
      }
    }
    
    setIsLoading(false);
  }, []);

  const requestMagicLink = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/customer/auth/request-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Check your email for a login link!');
        return { success: true };
      } else {
        toast.error(data.message || 'Failed to send login link');
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Magic link request error:', error);
      toast.error('Failed to send login link. Please try again.');
      return { success: false, message: 'Network error' };
    }
  };

  const verifyMagicLink = async (token) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE}/customer/auth/verify-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (data.success) {
        const { token: sessionToken, refreshToken: newRefreshToken, customer } = data.data;
        
        // Store auth data
        localStorage.setItem('customerToken', sessionToken);
        localStorage.setItem('customerRefreshToken', newRefreshToken);
        localStorage.setItem('customerData', JSON.stringify(customer));
        
        setToken(sessionToken);
        setRefreshToken(newRefreshToken);
        setCustomer(customer);
        
        toast.success('Login successful! Welcome back.');
        return { success: true };
      } else {
        toast.error(data.message || 'Invalid or expired login link');
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Magic link verification error:', error);
      toast.error('Failed to verify login link. Please try again.');
      return { success: false, message: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/customer/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();
      
      if (data.success) {
        const { token: newToken, customer } = data.data;
        
        localStorage.setItem('customerToken', newToken);
        localStorage.setItem('customerData', JSON.stringify(customer));
        
        setToken(newToken);
        setCustomer(customer);
        
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/customer/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerRefreshToken');
      localStorage.removeItem('customerData');
      localStorage.removeItem('customerCurrentRoute');
      
      setToken(null);
      setRefreshToken(null);
      setCustomer(null);
      
      toast.success('Logged out successfully');
    }
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!token) {
      throw new Error('No authentication token');
    }

    let authToken = token;

    const makeRequest = async (authToken) => {
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
    };

    let response = await makeRequest(authToken);

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await makeRequest(token);
      } else {
        throw new Error('Authentication failed');
      }
    }

    return response;
  };

  const value = {
    customer,
    token,
    isAuthenticated: !!token && !!customer,
    isLoading,
    requestMagicLink,
    verifyMagicLink,
    logout,
    makeAuthenticatedRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
