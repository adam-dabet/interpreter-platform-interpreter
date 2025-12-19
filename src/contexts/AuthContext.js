import React, { createContext, useContext, useState, useEffect } from 'react';
import { interpreterTokenHandler } from '../utils/tokenExpirationHandler';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get API base URL (same logic as api.js)
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
      return '/api';
    }
  }
  
  // Default fallback for local development
  return '/api';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth data on app load
    const storedToken = localStorage.getItem('interpreterToken');
    const storedUser = localStorage.getItem('interpreterUser');
    const storedProfile = localStorage.getItem('interpreterProfile');

    console.log('AuthContext useEffect - stored data:', {
      hasToken: !!storedToken,
      hasUser: !!storedUser,
      hasProfile: !!storedProfile
    });

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        logout();
      }
    }
    
    setIsLoading(false);
  }, []);

  // Load profile when token is available
  useEffect(() => {
    if (token && user) {
      console.log('Token and user available, loading profile...');
      loadProfile();
    }
  }, [token, user]);

  const loadProfile = async () => {
    if (!token) {
      console.log('loadProfile called but no token available');
      return;
    }
    
    try {
      console.log('loadProfile called with token:', token ? 'Token exists' : 'No token');
      const baseURL = getApiBaseURL();
      const apiUrl = `${baseURL}/interpreters/profile`;
      console.log('Loading profile from:', apiUrl);
      
      const response = await interpreterTokenHandler.fetchWithExpirationHandling(
        apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        },
        logout
      );

      console.log('Profile response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Profile response data:', result);
        const freshProfile = result.data || result;
        
        // Update local storage and state
        localStorage.setItem('interpreterProfile', JSON.stringify(freshProfile));
        setProfile(freshProfile);
      } else {
        const errorText = await response.text();
        console.error('Profile response error:', errorText);
        // Try to parse as JSON if possible
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Profile error details:', errorJson);
        } catch (e) {
          // Not JSON, that's fine
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Don't throw error here as it's not critical for app startup
    }
  };

  const login = (authData) => {
    const { token: newToken, user: newUser, interpreterProfile } = authData;
    
    localStorage.setItem('interpreterToken', newToken);
    localStorage.setItem('interpreterUser', JSON.stringify(newUser));
    if (interpreterProfile) {
      localStorage.setItem('interpreterProfile', JSON.stringify(interpreterProfile));
    }
    
    setToken(newToken);
    setUser(newUser);
    setProfile(interpreterProfile);
  };

  const logout = () => {
    localStorage.removeItem('interpreterToken');
    localStorage.removeItem('interpreterUser');
    localStorage.removeItem('interpreterProfile');
    localStorage.removeItem('interpreterCurrentRoute');
    
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('updateProfile called with data:', profileData);
      const baseURL = getApiBaseURL();
      const apiUrl = `${baseURL}/interpreters/profile`;
      
      const response = await interpreterTokenHandler.fetchWithExpirationHandling(
        apiUrl,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        },
        logout
      );

      console.log('Update profile response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update profile error response:', errorText);
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      const updatedProfile = result.data;
      
      // Update local storage and state
      localStorage.setItem('interpreterProfile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!token) {
      interpreterTokenHandler.handleTokenExpiration(logout);
      throw new Error('No authentication token');
    }

    // Ensure we use the correct API base URL
    const baseURL = getApiBaseURL();
    const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

    return interpreterTokenHandler.fetchWithExpirationHandling(fullUrl, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, logout);
  };

  const value = {
    user,
    profile,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated,
    updateProfile,
    loadProfile,
    makeAuthenticatedRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
