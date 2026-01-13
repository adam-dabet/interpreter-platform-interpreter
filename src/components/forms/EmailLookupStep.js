import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EmailLookupStep = ({ onEmailFound, onEmailNotFound, isLoading }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsValidating(true);
    try {
      const result = await onEmailFound(email.trim());
      if (result?.found) {
        if (result?.alreadyRegistered) {
          // Email is already registered
          setAlreadyRegistered(true);
          setSentMessage(result.message || 'This email is already registered. Please log in to access your account.');
        } else {
          // Email found and sent
          setEmailSent(true);
          setSentMessage(result.message || 'Please check your email for a link to complete your registration.');
        }
      } else {
        // Email not found - proceed with normal registration
        onEmailNotFound();
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  if (alreadyRegistered) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 text-center"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <ExclamationCircleIcon className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Already Exists
          </h2>
          <p className="text-gray-600 mb-6">
            {sentMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login">
            <Button className="w-full sm:w-auto">
              Go to Login
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setAlreadyRegistered(false);
              setEmail('');
              setError('');
            }}
            className="w-full sm:w-auto"
          >
            Try Different Email
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Forgot your password?</strong> You can reset it from the login page.
          </p>
        </div>
      </motion.div>
    );
  }

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 text-center"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-600 mb-4">
            {sentMessage}
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to continue with your registration. The link will take you to a form with your information pre-filled.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Didn't receive the email?</strong> Check your spam folder or try again with a different email address.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h2>
        <p className="text-gray-600">
          Enter your email address to see if we already have your information in our system.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="email"
            label="Email Address"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            error={error}
            required
            disabled={isValidating || isLoading}
            autoFocus
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isValidating || isLoading || !email.trim()}
            loading={isValidating || isLoading}
            className="w-full sm:w-auto"
          >
            {isValidating || isLoading ? 'Checking...' : 'Continue'}
          </Button>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> If we find your email in our system, we'll send you a secure link to complete your registration. If not, you'll continue with a new registration.
        </p>
      </div>
    </motion.div>
  );
};

export default EmailLookupStep;

