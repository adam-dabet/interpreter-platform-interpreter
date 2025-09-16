import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Save current route to localStorage whenever it changes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      localStorage.setItem('interpreterCurrentRoute', location.pathname);
    }
  }, [location.pathname, isAuthenticated, isLoading]);

  // Restore route from localStorage on authentication
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const savedRoute = localStorage.getItem('interpreterCurrentRoute');
      
      // Only restore if we're not already on a valid route
      if (savedRoute && savedRoute !== '/' && savedRoute !== '/dashboard') {
        // Check if the saved route is valid (not public pages)
        if (!savedRoute.startsWith('/apply') && !savedRoute.startsWith('/status') && !savedRoute.startsWith('/login')) {
          navigate(savedRoute, { replace: true });
        }
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  return null; // This component doesn't render anything
};

export default RoutePersistence;
