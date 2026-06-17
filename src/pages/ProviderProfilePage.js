import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isTransportationProvider } from '../utils/providerUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Profile from './Profile';
import TransportationProfile from './TransportationProfile';

const ProviderProfilePage = () => {
  const { profile, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (isTransportationProvider(profile)) {
    return <TransportationProfile />;
  }

  return <Profile />;
};

export default ProviderProfilePage;
