import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jobAPI from '../services/jobAPI';
import { toast } from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { milesInputToNumber, isPartialMilesInput } from '../utils/mileageInputUtils';

const JobAction = () => {
  const { jobId, action, interpreterId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [showMileageFields, setShowMileageFields] = useState(false);
  const [mileageMilesInput, setMileageMilesInput] = useState('0');
  const mileageRequested = milesInputToNumber(mileageMilesInput);
  const [mileageRate, setMileageRate] = useState(0.70);
  const [mileagePromptLoading, setMileagePromptLoading] = useState(false);
  const FEDERAL_MILEAGE_CAP = 0.72;

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

  useEffect(() => {
    if (!showMileagePrompt) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showMileagePrompt]);

  const handleAction = async () => {
    setLoading(true);
    try {
      let response;
      const data = action === 'decline' ? { declined_reason: 'Declined via email link' } : {};

      if (action === 'accept') {
        // For accept action, always show mileage prompt first
        setShowMileagePrompt(true);
        setShowMileageFields(false);
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
      const effectiveRate = Math.min(FEDERAL_MILEAGE_CAP, Math.max(0, parseFloat(mileageRate) || 0.70));
      const response = await jobAPI.acceptJob(jobId, { 
        mileage_requested: mileageRequested,
        mileage_rate: effectiveRate
      });
      
      toast.success('Job accepted successfully! Your mileage request is pending admin approval.');
      setShowMileagePrompt(false);
      setShowMileageFields(false);
      setMileageMilesInput('0');
      setMileageRate(0.70);
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
      setShowMileageFields(false);
      setMileageMilesInput('0');
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
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black bg-opacity-50 touch-pan-y [-webkit-overflow-scrolling:touch]">
          <div className="flex min-h-[100vh] min-h-dvh w-full items-center justify-center px-4 py-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
            <div className="relative w-full max-w-md shrink-0 rounded-lg bg-white p-5 shadow-md sm:p-8">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowMileagePrompt(false);
                setShowMileageFields(false);
                setMileageMilesInput('0');
                setMileageRate(0.70);
              }}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:right-4 sm:top-4"
              aria-label="Close"
            >
              <XCircleIcon className="h-7 w-7 sm:h-6 sm:w-6" />
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
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>Please note:</strong> Mileage requests for assignments under a 25-mile radius will not be approved. Please avoid entering mileage unless it is truly over 25 miles from your location.
                    </p>
                  </div>
                </div>
              </div>
              {!showMileageFields ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-800 text-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 leading-snug">
                    Tap <span className="font-semibold text-blue-900">Enter miles & rate</span> below to open the form. Miles and per-mile rate are filled in on the next step after you tap.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:space-x-3 sm:gap-0">
                    <button
                      type="button"
                      onClick={() => setShowMileageFields(true)}
                      disabled={mileagePromptLoading}
                      className="min-h-[48px] flex-1 touch-manipulation rounded-md border-2 border-blue-600 bg-white px-4 py-3 text-base font-semibold text-blue-900 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 sm:text-sm"
                    >
                      Enter miles & rate
                    </button>
                    <button
                      type="button"
                      onClick={handleNoMileage}
                      disabled={mileagePromptLoading}
                      className="min-h-[48px] flex-1 touch-manipulation rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 sm:text-sm"
                    >
                      {mileagePromptLoading ? 'Submitting...' : 'Proceed with no mileage'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Miles to job location:
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={mileageMilesInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (isPartialMilesInput(v)) setMileageMilesInput(v);
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Clear the field and enter your miles, or use Back if you do not need mileage.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate per mile ($):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={FEDERAL_MILEAGE_CAP}
                      step="0.01"
                      value={mileageRate}
                      onChange={(e) => setMileageRate(Math.min(FEDERAL_MILEAGE_CAP, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full rounded-md border border-gray-300 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2"
                      placeholder="0.70"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Federal cap: ${FEDERAL_MILEAGE_CAP}/mile.
                    </p>
                    {mileageRequested > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Estimated reimbursement: ${(mileageRequested * Math.min(FEDERAL_MILEAGE_CAP, mileageRate || 0.70)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </>
              )}

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

              {showMileageFields && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMileageFields(false);
                      setMileageMilesInput('0');
                    }}
                    disabled={mileagePromptLoading}
                    className="min-h-[48px] flex-1 touch-manipulation rounded-md bg-gray-200 px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 sm:text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleMileageSubmit}
                    disabled={mileagePromptLoading || mileageRequested <= 0}
                    className="min-h-[48px] flex-1 touch-manipulation rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 sm:text-sm"
                  >
                    {mileagePromptLoading ? 'Submitting...' : 'Request Mileage'}
                  </button>
                </div>
              )}
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
