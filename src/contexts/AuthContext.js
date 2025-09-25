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
      const response = await interpreterTokenHandler.fetchWithExpirationHandling(
        `${process.env.REACT_APP_API_URL}/interpreters/profile`,
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
        const freshProfile = result.data;
        
        // Update local storage and state
        localStorage.setItem('interpreterProfile', JSON.stringify(freshProfile));
        setProfile(freshProfile);
      } else {
        const errorText = await response.text();
        console.error('Profile response error:', errorText);
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
      
      const response = await interpreterTokenHandler.fetchWithExpirationHandling(
        `${process.env.REACT_APP_API_URL}/interpreters/profile`,
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

    return interpreterTokenHandler.fetchWithExpirationHandling(url, {
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
