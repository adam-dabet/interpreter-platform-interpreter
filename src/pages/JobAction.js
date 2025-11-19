import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jobAPI from '../services/jobAPI';
import { toast } from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const JobAction = () => {
  const { jobId, action, interpreterId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [mileageRequested, setMileageRequested] = useState(0);
  const [mileagePromptLoading, setMileagePromptLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !action || !interpreterId) {
      navigate('/login');
      return;
    }

    if (!['accept', 'decline'].includes(action)) {
      navigate('/login');
      return;
    }

    handleAction();
  }, [jobId, action, interpreterId]);

  const handleAction = async () => {
    setLoading(true);
    try {
      let response;
      const data = action === 'decline' ? { declined_reason: 'Declined via email link' } : {};

      if (action === 'accept') {
        // For accept action, always show mileage prompt first
        setShowMileagePrompt(true);
        setLoading(false);
        return;
      } else {
        response = await jobAPI.declineJob(jobId, data);
        toast.success('Job declined');
        setCompleted(true);
        
        // Redirect for decline
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }

    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      toast.error(`Failed to ${action} job: ${error.response?.data?.message || error.message}`);
      
      // Redirect to login if unauthorized
      if (error.response?.status === 401) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Redirect to dashboard on other errors
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMileageSubmit = async () => {
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(jobId, { 
        mileage_requested: mileageRequested 
      });
      
      toast.success('Job accepted successfully! Your mileage request is pending admin approval.');
      setShowMileagePrompt(false);
      setCompleted(true);
      
      setTimeout(() => {
        navigate(`/job/${jobId}`);
      }, 2000);
    } catch (error) {
      console.error('Error submitting mileage request:', error);
      toast.error(`Failed to submit mileage request: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  const handleNoMileage = async () => {
    setMileagePromptLoading(true);
    try {
      const response = await jobAPI.acceptJob(jobId, {});
      
      toast.success('Job accepted successfully!');
      setShowMileagePrompt(false);
      setCompleted(true);
      
      setTimeout(() => {
        navigate(`/job/${jobId}`);
      }, 2000);
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error(`Failed to accept job: ${error.response?.data?.message || error.message}`);
    } finally {
      setMileagePromptLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {action === 'accept' ? 'Accepting Job...' : 'Declining Job...'}
            </h2>
            <p className="text-gray-600">
              Please wait while we process your response.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (showMileagePrompt) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowMileagePrompt(false);
                setMileageRequested(0);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
            
            <div className="text-center mb-6">
              <CheckCircleIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Mileage Reimbursement
              </h2>
              <p className="text-gray-600 text-sm">
                Do you need to be reimbursed for mileage to this job location?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Miles to job location:
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={mileageRequested}
                  onChange={(e) => setMileageRequested(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                {mileageRequested > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated reimbursement: ${(mileageRequested * 0.7).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> If you request mileage reimbursement, your assignment will need admin approval before being confirmed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleNoMileage}
                  disabled={mileagePromptLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  No Mileage Needed
                </button>
                <button
                  onClick={handleMileageSubmit}
                  disabled={mileagePromptLoading || mileageRequested <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {mileagePromptLoading ? 'Submitting...' : 'Request Mileage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (completed) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            {action === 'accept' ? (
              <>
                <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Job Accepted!
                </h2>
                <p className="text-gray-600 mb-4">
                  You have successfully accepted this job. You'll be redirected to your dashboard shortly.
                </p>
              </>
            ) : (
              <>
                <XCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Job Declined
                </h2>
                <p className="text-gray-600 mb-4">
                  You have declined this job. You'll be redirected to your dashboard shortly.
                </p>
              </>
            )}
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
};

export default JobAction;
