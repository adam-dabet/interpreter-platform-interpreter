import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobTimer = ({ jobId, jobStatus, onJobUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);

  // Check if job is already started
  useEffect(() => {
    if (jobStatus === 'started' || jobStatus === 'completed') {
      setIsRunning(true);
      setStartTime(new Date());
    }
  }, [jobStatus]);

  // Timer logic
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartJob = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setIsRunning(true);
        setStartTime(new Date());
        setElapsedTime(0);
        toast.success('Job started! Timer is running.');
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to start job');
      }
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error('Failed to start job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndJob = async () => {
    if (!isRunning) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const actualDurationMinutes = Math.ceil(elapsedTime / 60); // Convert seconds to minutes, rounded up
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actual_duration_minutes: actualDurationMinutes
        })
      });

      if (response.ok) {
        const result = await response.json();
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        toast.success(`Job ended! Duration: ${formatTime(elapsedTime)}`);
        if (onJobUpdate) {
          onJobUpdate(result.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to end job');
      }
    } catch (error) {
      console.error('Error ending job:', error);
      toast.error('Failed to end job');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (jobStatus === 'completed') return 'text-green-600';
    if (jobStatus === 'started') return 'text-blue-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (jobStatus === 'completed') return 'Completed';
    if (jobStatus === 'started') return 'In Progress';
    return 'Not Started';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Job Timer
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-sm text-gray-500">
          {isRunning ? 'Timer Running...' : 'Timer Stopped'}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {!isRunning && jobStatus !== 'completed' && (
          <button
            onClick={handleStartJob}
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Starting...' : 'Start Job'}
          </button>
        )}

        {isRunning && jobStatus !== 'completed' && (
          <button
            onClick={handleEndJob}
            disabled={isLoading}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <StopIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Ending...' : 'End Job'}
          </button>
        )}

        {jobStatus === 'completed' && (
          <div className="flex-1 bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center justify-center">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Job Completed
          </div>
        )}
      </div>

      {/* Job Status Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Job ID:</span>
            <span className="font-mono">{jobId}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">{getStatusText()}</span>
          </div>
          {startTime && (
            <div className="flex justify-between">
              <span>Started:</span>
              <span>{startTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobTimer;
