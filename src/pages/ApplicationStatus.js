import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';

const ApplicationStatus = () => {
  const [applicationId, setApplicationId] = useState('');
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!applicationId || !email) {
      setError('Please enter both Application ID and Email');
      return;
    }

    setIsSearching(true);
    setError('');
    
    // Simulate API call
    setTimeout(() => {
      // Mock data - replace with actual API call
      const mockData = {
        application_id: applicationId,
        status: 'under_review',
        submitted_date: '2024-01-15T10:30:00Z',
        estimated_completion: '2024-01-22T10:30:00Z',
        current_step: 'Background Check',
        applicant_name: 'John Doe',
        email: email,
        progress: 75,
        steps: [
          { name: 'Application Submitted', status: 'completed', date: '2024-01-15' },
          { name: 'Document Review', status: 'completed', date: '2024-01-16' },
          { name: 'Background Check', status: 'in_progress', date: null },
          { name: 'Final Review', status: 'pending', date: null },
          { name: 'Approval', status: 'pending', date: null }
        ]
      };
      
      setApplicationData(mockData);
      setIsSearching(false);
    }, 1500);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900 mb-4"
          >
            Check Application Status
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            Enter your application ID and email to track your interpreter application progress
          </motion.p>
        </div>

        {/* Search Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-2">
                  Application ID
                </label>
                <input
                  type="text"
                  id="applicationId"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your application ID"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSearching}
              className="w-full md:w-auto"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                  Check Status
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Application Status Results */}
        {applicationData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            {/* Application Info */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Application Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Application ID:</span>
                      <span className="ml-2 text-gray-900">{applicationData.application_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Applicant:</span>
                      <span className="ml-2 text-gray-900">{applicationData.applicant_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Email:</span>
                      <span className="ml-2 text-gray-900">{applicationData.email}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Submitted:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(applicationData.submitted_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Current Status
                  </h3>
                  <div className="space-y-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(applicationData.status)}`}>
                      {applicationData.status === 'under_review' && <ClockIcon className="h-4 w-4 mr-1" />}
                      {applicationData.status === 'approved' && <CheckCircleIcon className="h-4 w-4 mr-1" />}
                      {applicationData.status === 'rejected' && <ExclamationTriangleIcon className="h-4 w-4 mr-1" />}
                      {applicationData.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Current Step: {applicationData.current_step}
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated Completion: {new Date(applicationData.estimated_completion).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Application Progress
              </h3>
              <div className="space-y-4">
                {applicationData.steps.map((step, index) => (
                  <div key={step.name} className="flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{step.name}</span>
                        {step.date && (
                          <span className="text-sm text-gray-500">
                            {new Date(step.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {step.status === 'in_progress' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${applicationData.progress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Need Help?
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                If you have any questions about your application status, please contact our support team.
              </p>
              <div className="text-sm text-blue-800">
                <div>Email: support@interpreterplatform.com</div>
                <div>Phone: (555) 123-4567</div>
                <div>Hours: Monday - Friday, 9:00 AM - 6:00 PM EST</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ApplicationStatus;






