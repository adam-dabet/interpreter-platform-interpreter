import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import Input from '../ui/Input';
import { personalInfoSchema } from '../../services/validationSchemas';
import { formatPhoneNumber } from '../../utils/helpers';

const PersonalInfoStep = ({ data, onNext, onUpdate, onPrevious, isEditing, parametricData }) => {
  // Ensure all form fields have proper default values to prevent uncontrolled to controlled warnings
  const defaultValues = {
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    business_name: '',
    ...data // Spread any existing data on top of defaults
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(personalInfoSchema),
    defaultValues,
    mode: 'onChange'
  });

  // Update parent component when form values change
  React.useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate]);

  const onSubmit = (formData) => {
    onNext(formData);
  };

  const handlePhoneChange = (field, value) => {
    const formatted = formatPhoneNumber(value);
    setValue(field, formatted);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">Let's start with your basic contact information.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="First Name"
                placeholder="Enter your first name"
                error={errors.first_name?.message}
                required
              />
            )}
          />
          
          <Controller
            name="last_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Last Name"
                placeholder="Enter your last name"
                error={errors.last_name?.message}
                required
              />
            )}
          />
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="email"
                label="Email Address"
                placeholder="your.email@example.com"
                error={errors.email?.message}
                required
              />
            )}
          />
          
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="tel"
                label="Phone Number"
                placeholder="(555) 123-4567"
                error={errors.phone?.message}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                required
              />
            )}
          />
        </div>

        {/* Date of Birth and Business Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="date_of_birth"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                label="Date of Birth"
                error={errors.date_of_birth?.message}
                helper="Optional - helps us verify your identity"
              />
            )}
          />
          
          <Controller
            name="business_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Business Name"
                placeholder="Your Business Name (optional)"
                error={errors.business_name?.message}
                helper="If you operate as a business entity"
              />
            )}
          />
        </div>



        {/* Navigation Buttons */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {isEditing ? 'Save & Return to Review' : 'Continue'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default PersonalInfoStep;