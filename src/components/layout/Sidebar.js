import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  UserIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  GiftIcon,
  BanknotesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import jobAPI from '../../services/jobAPI';
import { isTransportationProvider } from '../../utils/providerUtils';
import { jobNeedsAvailabilityConfirmation } from '../../utils/jobConfirmation';
import { getJobScheduledDateTime } from '../../utils/dateUtils';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout, profile, user } = useAuth();
  const isTransport = isTransportationProvider(profile);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isTransport) {
      loadPendingCount();
      const interval = setInterval(loadPendingCount, 60000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isTransport]);

  const loadPendingCount = async () => {
    try {
      const response = await jobAPI.getMyJobs({ limit: 100 });
      const jobs = response.data?.data?.jobs || [];
      const now = new Date();

      const overdueReports = jobs.filter(job => {
        if (job.status !== 'completed' || job.completion_report_submitted) return false;
        if (!job.completed_at) return false;
        const hoursSince = (now - new Date(job.completed_at)) / (1000 * 60 * 60);
        return hoursSince > 24;
      }).length;

      const needsConfirmation = jobs.filter(job => {
        if (!jobNeedsAvailabilityConfirmation(job)) return false;
        const jobDate = getJobScheduledDateTime(job);
        return jobDate && jobDate > now;
      }).length;

      setPendingCount(overdueReports + needsConfirmation);
    } catch (error) {
      // Silently ignore - badge just won't show
    }
  };

  const interpreterNav = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Schedule', href: '/schedule', icon: CalendarIcon },
    { name: 'Find Jobs', href: '/jobs/search', icon: MagnifyingGlassIcon },
    { name: 'Pending', href: '/pending', icon: BellIcon, badge: pendingCount },
    { name: 'My Jobs', href: '/jobs', icon: CalendarIcon },
    { name: 'Refer & Earn', href: '/refer', icon: GiftIcon },
    { name: 'Payout Settings', href: '/payout-settings', icon: BanknotesIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  if (profile?.is_agency) {
    interpreterNav.splice(interpreterNav.length - 1, 0, {
      name: 'Team Members',
      href: '/agency-members',
      icon: UsersIcon,
    });
  }

  const navigation = isTransport
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Find Trips', href: '/trips/find', icon: MagnifyingGlassIcon },
        { name: 'Payout Settings', href: '/payout-settings', icon: BanknotesIcon },
        { name: 'Profile', href: '/profile', icon: UserIcon },
      ]
    : interpreterNav;

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-ink text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:h-screen overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 min-w-0">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center text-ink font-semibold">
                {(profile?.business_name?.[0] || profile?.first_name?.[0] || user?.first_name?.[0] || 'P').toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2
                className="text-sm font-semibold text-white truncate"
                title={
                  isTransport
                    ? (profile?.business_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim())
                    : `${profile?.first_name || user?.first_name || 'Interpreter'} ${profile?.last_name || user?.last_name || ''}`.trim()
                }
              >
                {isTransport
                  ? (profile?.business_name || `${profile?.first_name || ''} ${profile?.last_name?.[0] || ''}.`.trim())
                  : `${profile?.first_name || user?.first_name || 'Interpreter'} ${profile?.last_name?.[0] || user?.last_name?.[0] || ''}.`}
              </h2>
              <p className="text-xs text-white/60 truncate">
                {isTransport ? 'Transportation Portal' : 'Interpreter Portal'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden flex-shrink-0 p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                    ${isActive(item.href)
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </span>
                  {item.badge > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-white/70 rounded-lg hover:bg-white/5 hover:text-white transition-colors duration-200"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
