import React, { createContext, useContext, useState, useEffect } from 'react';
import jobAPI from '../services/jobAPI';
import { toast } from 'react-hot-toast';

const JobRestrictionContext = createContext();

export const useJobRestrictions = () => {
  const context = useContext(JobRestrictionContext);
  if (!context) throw new Error('useJobRestrictions must be used within a JobRestrictionProvider');
  return context;
};

export const JobRestrictionProvider = ({ children }) => {
  const [hasOverdueReports, setHasOverdueReports] = useState(false);
  const [overdueJobs, setOverdueJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOverdueReports();
    
    // Recheck every minute
    const interval = setInterval(checkOverdueReports, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkOverdueReports = async () => {
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

      setHasOverdueReports(overdueReports.length > 0);
      setOverdueJobs(overdueReports);
    } catch (error) {
      console.error('Error checking overdue reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAcceptJobs = () => {
    return !hasOverdueReports;
  };

  const showJobAcceptanceBlocked = () => {
    if (hasOverdueReports) {
      toast.error(
        'Cannot accept new jobs. You have overdue completion reports that must be submitted first.',
        { duration: 5000 }
      );
      return true;
    }
    return false;
  };

  const value = {
    hasOverdueReports,
    overdueJobs,
    loading,
    canAcceptJobs,
    showJobAcceptanceBlocked,
    refreshOverdueReports: checkOverdueReports
  };

  return (
    <JobRestrictionContext.Provider value={value}>
      {children}
    </JobRestrictionContext.Provider>
  );
};

export default JobRestrictionProvider;
