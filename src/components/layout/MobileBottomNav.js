import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CalendarIcon as CalendarIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  BellIcon as BellIconSolid,
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid';
import jobAPI from '../../services/jobAPI';

const MobileBottomNav = () => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    try {
      const response = await jobAPI.getMyJobs({ limit: 100 });
      const jobs = response.data.data.jobs;
      const now = new Date();

      // Count pending actions
      const overdueReports = jobs.filter(job => {
        if (job.status !== 'completed' || job.completion_report_submitted) return false;
        if (!job.completed_at) return false;
        const completedTime = new Date(job.completed_at);
        const hoursSince = (now - completedTime) / (1000 * 60 * 60);
        return hoursSince > 24;
      }).length;

      const needsConfirmation = jobs.filter(job => {
        if (job.assignment_status !== 'pending_confirmation') return false;
        const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
        const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 48;
      }).length;

      setPendingCount(overdueReports + needsConfirmation);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  const navItems = [
    {
      name: 'Home',
      path: '/dashboard',
      icon: HomeIcon,
      iconSolid: HomeIconSolid
    },
    {
      name: 'Schedule',
      path: '/schedule',
      icon: CalendarIcon,
      iconSolid: CalendarIconSolid
    },
    {
      name: 'Find Jobs',
      path: '/jobs/search',
      icon: MagnifyingGlassIcon,
      iconSolid: MagnifyingGlassIconSolid
    },
    {
      name: 'Pending',
      path: '/pending',
      icon: BellIcon,
      iconSolid: BellIconSolid,
      badge: pendingCount
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: UserIcon,
      iconSolid: UserIconSolid
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = active ? item.iconSolid : item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center relative ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

