import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { validateNewPasswordPolicy } from '../utils/passwordPolicy';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFirstTimePasswordChange = user?.passwordChanged === false;
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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Function to check password requirements
  const checkPasswordRequirements = (password) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
      onlyAllowedChars: /^[A-Za-z\d@$!%*?&]+$/.test(password),
    };
  };

  // Get current password requirements status
  const passwordRequirements = checkPasswordRequirements(formData.newPassword);
  
  // Calculate password strength
  const getPasswordStrength = () => {
    const requirements = Object.values(passwordRequirements);
    const metRequirements = requirements.filter(Boolean).length;

    if (metRequirements === 0) return { strength: 'Very Weak', color: 'bg-red-500', width: '0%' };
    if (metRequirements === 1) return { strength: 'Weak', color: 'bg-red-400', width: '17%' };
    if (metRequirements === 2) return { strength: 'Fair', color: 'bg-yellow-400', width: '33%' };
    if (metRequirements === 3) return { strength: 'Good', color: 'bg-yellow-500', width: '50%' };
    if (metRequirements === 4) return { strength: 'Strong', color: 'bg-green-400', width: '67%' };
    if (metRequirements === 5) return { strength: 'Very Strong', color: 'bg-green-500', width: '83%' };
    return { strength: 'Very Strong', color: 'bg-green-600', width: '100%' };
  };
  
  const passwordStrength = getPasswordStrength();

  const buildDetailedError = (error) => {
    const fieldErrors = {};

    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      error.response.data.errors.forEach((err) => {
        if (err.path) {
          fieldErrors[err.path] = err.msg;
        }
      });

      const combinedMessage = error.response.data.errors
        .map((err) => err.msg)
        .filter(Boolean)
        .join(', ');

      return {
        message: combinedMessage || 'Please check the highlighted fields and try again.',
        fieldErrors
      };
    }

    if (error.response?.status === 401) {
      fieldErrors.currentPassword = 'Current password is incorrect';
      return {
        message: error.response?.data?.message || 'Current password is incorrect',
        fieldErrors
      };
    }

    if (error.response?.status === 400 && error.response?.data?.message) {
      return {
        message: error.response.data.message,
        fieldErrors
      };
    }

    return {
      message: error.response?.data?.message || error.message || 'Failed to change password. Please try again.',
      fieldErrors
    };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const policyMsg = validateNewPasswordPolicy(formData.newPassword);
      if (policyMsg) {
        newErrors.newPassword = policyMsg;
      } else if (formData.currentPassword === formData.newPassword) {
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

    setIsLoading(true);
    
    try {
      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data && response.data.success) {
        toast.success('Password changed successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.data?.message || 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      const { message, fieldErrors } = buildDetailedError(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center"
          >
            <LockClosedIcon className="h-8 w-8 text-white" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-3xl font-extrabold text-gray-900"
          >
            Change Password
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-sm text-gray-600"
          >
            Please set a new password for your account
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          {isFirstTimePasswordChange && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Use the temporary password from your approval email as your current password.
            </div>
          )}

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Enter your current password"
                  error={errors.currentPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter your new password"
                  error={errors.newPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Password Strength:</h4>
                <span className={`text-sm font-medium ${
                  passwordStrength.strength.includes('Weak') ? 'text-red-600' :
                  passwordStrength.strength.includes('Fair') ? 'text-yellow-600' :
                  passwordStrength.strength.includes('Good') ? 'text-yellow-700' :
                  'text-green-600'
                }`}>
                  {passwordStrength.strength}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: passwordStrength.width }}
                ></div>
              </div>
            </div>
          )}

          {/* Password Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
            <ul className="text-sm space-y-1">
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.minLength ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.minLength ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                At least 8 characters long
              </li>
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.hasUppercase ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.hasUppercase ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                One uppercase letter
              </li>
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.hasLowercase ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.hasLowercase ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                One lowercase letter
              </li>
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.hasNumber ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.hasNumber ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                One number
              </li>
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.hasSpecialChar ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.hasSpecialChar ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                One special character (@$!%*?&)
              </li>
              <li className={`flex items-center transition-colors duration-200 ${
                passwordRequirements.onlyAllowedChars ? 'text-green-700' : 'text-red-600'
              }`}>
                {passwordRequirements.onlyAllowedChars ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                )}
                Only letters, numbers, and @$!%*?& (no spaces or other symbols)
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Change Password'
            )}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
