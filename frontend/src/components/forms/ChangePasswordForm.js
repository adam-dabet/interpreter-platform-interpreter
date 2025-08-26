import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

const ChangePasswordForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score <= 2) return { score, label: 'Weak', color: 'text-red-600' };
    if (score <= 3) return { score, label: 'Fair', color: 'text-yellow-600' };
    if (score <= 4) return { score, label: 'Good', color: 'text-blue-600' };
    return { score, label: 'Strong', color: 'text-green-600' };
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Real-time validation for new password
    if (field === 'newPassword' && value) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      if (value.length < 8) {
        setErrors(prev => ({ ...prev, newPassword: 'Password must be at least 8 characters long' }));
      } else if (!passwordRegex.test(value)) {
        setErrors(prev => ({ ...prev, newPassword: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' }));
      } else if (formData.currentPassword && value === formData.currentPassword) {
        setErrors(prev => ({ ...prev, newPassword: 'New password must be different from your current password' }));
      } else {
        setErrors(prev => ({ ...prev, newPassword: null }));
      }
    }
    
    // Real-time validation for confirm password
    if (field === 'confirmPassword' && value && formData.newPassword) {
      if (value !== formData.newPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: null }));
      }
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      // Enhanced password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters long';
      } else if (!passwordRegex.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
      } else if (formData.currentPassword && formData.newPassword === formData.currentPassword) {
        newErrors.newPassword = 'New password must be different from your current password';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        if (onSuccess) {
          onSuccess();
        }
        if (onClose) {
          onClose();
        }
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to change password';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors from express-validator
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Set specific field errors if available
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.path) {
            fieldErrors[err.path] = err.msg;
          }
        });
        setErrors(prev => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <div className="relative">
            <Input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              placeholder="Enter your current password"
              error={errors.currentPassword}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.current ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <Input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Enter your new password"
              error={errors.newPassword}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.new ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Password strength:</span>
              <span className={`text-xs font-medium ${getPasswordStrength(formData.newPassword).color}`}>
                {getPasswordStrength(formData.newPassword).label}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  getPasswordStrength(formData.newPassword).score <= 2 ? 'bg-red-500' :
                  getPasswordStrength(formData.newPassword).score <= 3 ? 'bg-yellow-500' :
                  getPasswordStrength(formData.newPassword).score <= 4 ? 'bg-blue-500' : 'bg-green-500'
                }`}
                style={{ width: `${(getPasswordStrength(formData.newPassword).score / 5) * 100}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p className="font-medium mb-1">Password requirements:</p>
              <ul className="space-y-1">
                <li className={`flex items-center ${formData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-1">{formData.newPassword.length >= 8 ? '✓' : '○'}</span>
                  At least 8 characters
                </li>
                <li className={`flex items-center ${/[a-z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-1">{/[a-z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                  One lowercase letter
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-1">{/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                  One uppercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-1">{/\d/.test(formData.newPassword) ? '✓' : '○'}</span>
                  One number
                </li>
                <li className={`flex items-center ${/[@$!%*?&]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className="mr-1">{/[@$!%*?&]/.test(formData.newPassword) ? '✓' : '○'}</span>
                  One special character (@$!%*?&)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your new password"
              error={errors.confirmPassword}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password'}
          </Button>
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default ChangePasswordForm;
