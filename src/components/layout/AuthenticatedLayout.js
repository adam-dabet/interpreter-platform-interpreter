import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import BlockingModal from '../BlockingModal';
import jobAPI from '../../services/jobAPI';

const AuthenticatedLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blockingJobs, setBlockingJobs] = useState({ overdueReports: [], pendingConfirmations: [] });
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkBlockingConditions();
    
    // Recheck every minute
    const interval = setInterval(checkBlockingConditions, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const checkBlockingConditions = async () => {
    try {
      const response = await jobAPI.getMyJobs({ limit: 100 });
      const jobs = response.data.data.jobs;
      const now = new Date();

      // Find overdue reports (>24 hours)
      const overdueReports = jobs.filter(job => {
        if (job.status !== 'completed' || job.completion_report_submitted) return false;
        if (!job.completed_at) return false;
        const completedTime = new Date(job.completed_at);
        const hoursSince = (now - completedTime) / (1000 * 60 * 60);
        return hoursSince > 24;
      });

      // Find pending confirmations (within 48 hours)
      const pendingConfirmations = jobs.filter(job => {
        if (job.assignment_status !== 'pending_confirmation') return false;
        const jobDate = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
        const hoursUntil = (jobDate - now) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 48;
      });

      setBlockingJobs({ overdueReports, pendingConfirmations });
      
      // Show modals when conditions are met
      setShowOverdueModal(overdueReports.length > 0);
      setShowConfirmationModal(pendingConfirmations.length > 0 && overdueReports.length === 0);
    } catch (error) {
      console.error('Error checking blocking conditions:', error);
    }
  };

  // Only block on job search and job details pages, not on pending actions or job detail pages
  const shouldShowBlocking = () => {
    const blockablePages = ['/jobs/search', '/dashboard', '/schedule'];
    return blockablePages.includes(location.pathname);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md bg-white shadow-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1">
        <main className="bg-gray-50 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Blocking Modals */}
      {shouldShowBlocking() && (
        <>
          {/* Overdue Reports - Now closable */}
          <BlockingModal
            isOpen={showOverdueModal}
            type="overdue_report"
            jobs={blockingJobs.overdueReports}
            onClose={() => setShowOverdueModal(false)}
          />

          {/* Pending Confirmations - Can close but shows warning */}
          <BlockingModal
            isOpen={showConfirmationModal}
            type="pending_confirmation"
            jobs={blockingJobs.pendingConfirmations}
            onClose={() => setShowConfirmationModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default AuthenticatedLayout;
