import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CURRENT_ROUTE_KEY = 'interpreterCurrentRoute';
const LAST_LIST_ROUTE_KEY = 'interpreterLastJobListRoute';
const JOB_DETAIL_PREFIX = '/job/';

const RoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const buildFullPath = () => {
    const search = location.search || '';
    const hash = location.hash || '';
    return `${location.pathname}${search}${hash}`;
  };

  // Save current route to localStorage whenever it changes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const fullPath = buildFullPath();
      localStorage.setItem(CURRENT_ROUTE_KEY, fullPath);

      // Preserve the last meaningful list/dashboard route so we can return to it from job details
      if (!location.pathname.startsWith(JOB_DETAIL_PREFIX)) {
        localStorage.setItem(LAST_LIST_ROUTE_KEY, fullPath);
      }
    }
  }, [isAuthenticated, isLoading, location.pathname, location.search, location.hash]);

  // Restore route from localStorage on authentication
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const savedRoute = localStorage.getItem(CURRENT_ROUTE_KEY);
      
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
