import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import JobCard from './JobCard';

const BlockingModal = ({ 
  isOpen, 
  type, // 'overdue_report' or 'pending_confirmation'
  jobs = [],
  onClose // Optional for non-critical blocks
}) => {
  if (!isOpen || jobs.length === 0) return null;

  const config = type === 'overdue_report' ? {
    title: 'Completion Report Required',
    subtitle: 'Submit overdue reports to maintain your account status',
    bgColor: 'bg-red-600',
    iconColor: 'text-red-600',
    allowClose: true,
    message: 'Overdue completion reports must be submitted immediately. You can continue using the portal, but cannot accept new jobs until reports are submitted.'
  } : {
    title: 'Confirmation Required',
    subtitle: 'Please confirm your pending jobs before accepting new work',
    bgColor: 'bg-orange-600',
    iconColor: 'text-orange-600',
    allowClose: true,
    message: 'You have jobs that need confirmation. Confirm your attendance before accepting new work to maintain your reliability score.'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75"
            onClick={config.allowClose ? onClose : undefined}
          />

          {/* Modal */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className={`${config.bgColor} p-6 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-12 w-12" />
                    </div>
                    <div className="ml-4">
                      <h2 className="text-2xl font-bold">{config.title}</h2>
                      <p className="mt-1 text-white/90">{config.subtitle}</p>
                    </div>
                  </div>
                  {config.allowClose && onClose && (
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className={`bg-${type === 'overdue_report' ? 'red' : 'orange'}-50 border border-${type === 'overdue_report' ? 'red' : 'orange'}-200 rounded-lg p-4 mb-6`}>
                  <p className={`text-sm ${config.iconColor}`}>
                    {config.message}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'} Requiring Action:
                  </h3>
                  
                  {jobs.map(job => (
                    <div key={job.id} className="border-l-4 border-blue-500 pl-4">
                      <JobCard 
                        job={job} 
                        variant="compact"
                        showProgress={false}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {config.allowClose 
                    ? 'Click outside or use the X button to close this notification.'
                    : 'This window cannot be closed until you complete the required actions above.'
                  }
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BlockingModal;

