import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const VerifyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyMagicLink } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyMagicLink(token);
        
        if (result.success) {
          setStatus('success');
          setMessage('Login successful! Redirecting to your dashboard...');
          
          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Invalid or expired login link');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Failed to verify login link. Please try again.');
      }
    };

    verify();
  }, [searchParams, verifyMagicLink, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'verifying':
        return <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="w-12 h-12 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-12 h-12 text-red-600" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Verifying Your Login...';
      case 'success':
        return 'Login Successful!';
      case 'error':
        return 'Verification Failed';
      default:
        return '';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-8 text-center"
        >
          <div className={`mx-auto w-20 h-20 ${getBackgroundColor()} rounded-full flex items-center justify-center mb-6`}>
            {getIcon()}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {getTitle()}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          
          {status === 'error' && (
            <div className="space-y-4">
              <button
                onClick={() => navigate('/auth/login', { replace: true })}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Request New Login Link
              </button>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Common issues:</strong>
                  <br />• The link may have expired (links are valid for 30 minutes)
                  <br />• You may have already used this link
                  <br />• The link may have been corrupted when copied
                </p>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Welcome back! You'll be redirected to your dashboard shortly.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyPage;
