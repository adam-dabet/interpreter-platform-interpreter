import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EmailLookupStep = ({ onEmailFound, onEmailNotFound, isLoading }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

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
      // This will be handled by the parent component
      // We just pass the email up
      // The parent will call the API and handle the response
      const found = await onEmailFound(email.trim());
      if (!found) {
        onEmailNotFound();
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

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
          <strong>Note:</strong> If we find your information, we'll automatically fill in your details. If not, you'll continue with a new registration.
        </p>
      </div>
    </motion.div>
  );
};

export default EmailLookupStep;

