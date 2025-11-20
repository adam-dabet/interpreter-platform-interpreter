import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const JobTimer = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    if (token) {
      loadJobData();
    } else {
      setError('No token provided in URL');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let timerInterval = null;
    
    if (jobData?.jobStartedAt && !jobData?.jobEndedAt) {
      timerInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [jobData]);

  const loadJobData = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/magic-link/validate/${token}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to validate magic link');
      }

      setJobData(result.data);
      setLoading(false);

      // Calculate elapsed time if job is in progress
      if (result.data.jobStartedAt && !result.data.jobEndedAt) {
        const startTime = new Date(result.data.jobStartedAt);
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }

      // Calculate total duration if job is completed
      if (result.data.jobEndedAt) {
        const startTime = new Date(result.data.jobStartedAt);
        const endTime = new Date(result.data.jobEndedAt);
        setTotalDuration(Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      setError(error.message || 'Failed to load job information');
      setLoading(false);
    }
  };

  const startJob = async () => {
    setStarting(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/magic-link/start/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setJobData(prev => ({
          ...prev,
          jobStartedAt: result.data.startedAt,
          canStart: false,
          canEnd: true,
          status: result.data.status
        }));
        setSuccessMessage('Job started successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // If job is already started, reload the data instead of showing error
        if (result.message && (result.message.includes('already been started') || result.message.includes('already in progress'))) {
          setSuccessMessage('Job is already in progress!');
          setTimeout(() => setSuccessMessage(null), 3000);
          loadJobData(); // Reload to show current state
        } else {
          setError('Failed to start job: ' + result.message);
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error starting job:', error);
      setError('Failed to start job: ' + (error.message || 'Unknown error'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setStarting(false);
    }
  };

  const endJob = async () => {
    setEnding(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/magic-link/end/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setJobData(prev => ({
          ...prev,
          jobEndedAt: result.data.endedAt,
          canEnd: false,
          status: result.data.status
        }));
        setTotalDuration(elapsedTime);
        setSuccessMessage('Job completed successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // If job is already ended, reload the data instead of showing error
        if (result.message && (result.message.includes('already been ended') || result.message.includes('already been completed'))) {
          setSuccessMessage('Job is already completed!');
          setTimeout(() => setSuccessMessage(null), 3000);
          loadJobData(); // Reload to show current state
        } else {
          setError('Failed to end job: ' + result.message);
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error ending job:', error);
      setError('Failed to end job: ' + (error.message || 'Unknown error'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setEnding(false);
    }
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(date);
    const timeObj = new Date(`2000-01-01T${time}`);
    
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeStr = timeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${dateStr} at ${timeStr}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading job information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's a link validation error or a job action error
    const isLinkError = error.includes('Failed to validate magic link') || 
                       error.includes('Invalid or expired magic link') ||
                       error.includes('No token provided');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              {isLinkError ? 'Invalid Link' : 'Error'}
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            {isLinkError && (
              <p className="text-sm text-red-500">This link may have expired or is invalid. Please contact support if you need assistance.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Timer</h1>
          <p className="text-gray-600">Integrity Providers</p>
        </div>

        {/* Job Information */}
        <div className="max-w-2xl mx-auto">
          {/* Job Details Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{jobData.jobTitle}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">📅 Date & Time</h3>
                <p className="text-gray-600">{formatDateTime(jobData.scheduledDate, jobData.scheduledTime)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">👤 Interpreter</h3>
                <p className="text-gray-600">{jobData.interpreterName}</p>
              </div>
            </div>

            {/* Status Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Current Status</h3>
              <div className="flex items-center space-x-2">
                {!jobData.jobStartedAt && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    ⏳ Ready to Start
                  </span>
                )}
                {jobData.jobStartedAt && !jobData.jobEndedAt && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    🔄 In Progress
                  </span>
                )}
                {jobData.jobEndedAt && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    ✅ Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Start Button */}
            {jobData && jobData.canStart && (
              <div className="text-center">
                <button 
                  onClick={startJob} 
                  disabled={starting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors duration-200 animate-pulse"
                >
                  {starting ? 'Starting...' : '🚀 Start Job'}
                </button>
                <p className="text-gray-600 mt-2">Click to start timing your appointment</p>
              </div>
            )}

            {/* End Button */}
            {jobData && jobData.canEnd && (
              <div className="text-center">
                <div className="mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{formatDuration(elapsedTime)}</div>
                  <p className="text-gray-600">Time elapsed since start</p>
                </div>
                <button 
                  onClick={endJob} 
                  disabled={ending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors duration-200"
                >
                  {ending ? 'Ending...' : '🏁 End Job'}
                </button>
                <p className="text-gray-600 mt-2">Click to end timing and complete your appointment</p>
              </div>
            )}

            {/* Completed State */}
            {jobData && jobData.jobEndedAt && (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Job Completed!</h3>
                <p className="text-gray-600 mb-4">Your appointment has been successfully completed.</p>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">
                    <strong>Duration:</strong> {formatDuration(totalDuration)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobTimer;
