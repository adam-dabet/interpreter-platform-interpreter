import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import { personalInfoSchema } from '../../services/validationSchemas';
import { formatPhoneNumber } from '../../utils/helpers';

const PersonalInfoStep = ({ data, onNext, onUpdate, onPrevious, isEditing, parametricData, rejectedFields = [], registrationType }) => {
  const isAgency = registrationType === 'agency' || data?.is_agency;
  
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
    sms_consent: false,
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

  // Helper to check if field is rejected
  const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);



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
          {isAgency ? 'Agency Information' : 'Personal Information'}
        </h2>
        <p className="text-gray-600">
          {isAgency 
            ? "Let's start with your agency's basic contact information."
            : "Let's start with your basic contact information."
          }
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {isAgency ? (
          // Agency Registration Fields
          <>
            {/* Agency/Business Name (Required for agencies) */}
            <Controller
              name="business_name"
              control={control}
              render={({ field }) => (
                <div className={isFieldRejected('business_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                  <Input
                    {...field}
                    label="Agency / Business Name"
                    placeholder="Enter your agency or business name"
                    error={errors.business_name?.message || (isFieldRejected('business_name') ? 'This field needs to be updated' : '')}
                    required
                  />
                </div>
              )}
            />

            {/* Contact Person Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('first_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      label="Contact Person First Name"
                      placeholder="Enter contact person's first name"
                      error={errors.first_name?.message || (isFieldRejected('first_name') ? 'This field needs to be updated' : '')}
                    />
                  </div>
                )}
              />
              
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('last_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      label="Contact Person Last Name"
                      placeholder="Enter contact person's last name"
                      error={errors.last_name?.message || (isFieldRejected('last_name') ? 'This field needs to be updated' : '')}
                    />
                  </div>
                )}
              />
            </div>
          </>
        ) : (
          // Individual Registration Fields
          <>
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('first_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      label="First Name"
                      placeholder="Enter your first name"
                      error={errors.first_name?.message || (isFieldRejected('first_name') ? 'This field needs to be updated' : '')}
                      required
                    />
                  </div>
                )}
              />
              
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('last_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      label="Last Name"
                      placeholder="Enter your last name"
                      error={errors.last_name?.message || (isFieldRejected('last_name') ? 'This field needs to be updated' : '')}
                      required
                    />
                  </div>
                )}
              />
            </div>
          </>
        )}

        {/* Contact Information - Common for both */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <div className={isFieldRejected('email') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                <Input
                  {...field}
                  type="email"
                  label={isAgency ? "Contact Email" : "Email Address"}
                  placeholder="your.email@example.com"
                  error={errors.email?.message || (isFieldRejected('email') ? 'This field needs to be updated' : '')}
                  required
                />
              </div>
            )}
          />
          
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div className={isFieldRejected('phone') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                <Input
                  {...field}
                  type="tel"
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                  error={errors.phone?.message || (isFieldRejected('phone') ? 'This field needs to be updated' : '')}
                  onChange={(e) => handlePhoneChange('phone', e.target.value)}
                  required
                />
              </div>
            )}
          />
        </div>

        {/* Fields only for Individual */}
        {!isAgency && (
          <>
            {/* Date of Birth and Business Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="date_of_birth"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('date_of_birth') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      type="date"
                      label="Date of Birth"
                      error={errors.date_of_birth?.message || (isFieldRejected('date_of_birth') ? 'This field needs to be updated' : '')}
                      helper="Optional - helps us verify your identity"
                    />
                  </div>
                )}
              />
              
              <Controller
                name="business_name"
                control={control}
                render={({ field }) => (
                  <div className={isFieldRejected('business_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                    <Input
                      {...field}
                      label="Business Name"
                      placeholder="Your Business Name (optional)"
                      error={errors.business_name?.message || (isFieldRejected('business_name') ? 'This field needs to be updated' : '')}
                      helper="If you operate as a business entity"
                    />
                  </div>
                )}
              />
            </div>
          </>
        )}

        {/* SMS Consent Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Controller
            name="sms_consent"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                label="I consent to receive text messages"
                description="By checking this box, you agree to receive text messages from our platform regarding job opportunities, appointment reminders, and other important updates. Message and data rates may apply. You can opt out at any time by replying STOP."
                required
                error={errors.sms_consent?.message}
              />
            )}
          />
        </div>

        {/* Agency Info Box */}
        {isAgency && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Note:</strong> After your agency is approved, you'll be able to add individual interpreters to your roster from your dashboard.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {isEditing ? 'Save & Return to Review' : 'Next'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default PersonalInfoStep;