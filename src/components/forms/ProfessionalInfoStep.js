import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { professionalInfoSchema } from '../../services/validationSchemas';
import { SERVICE_TYPES, EDUCATION_LEVELS, TAX_CLASSIFICATIONS, RATE_UNITS } from '../../utils/constants';
import { formatPhoneNumber, formatSSN } from '../../utils/helpers';

const ProfessionalInfoStep = ({ data, onNext, onPrevious, onUpdate }) => {
  // Ensure all form fields have proper default values to prevent uncontrolled to controlled warnings
  const defaultValues = {
    business_name: '',
    education_level: '',
    bio: '',
    preferred_service_types: [],
    availability_notes: '',
    ...data // Spread any existing data on top of defaults
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(professionalInfoSchema),
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

  const handleServiceTypeChange = (serviceType, checked) => {
    const currentTypes = watch('preferred_service_types') || [];
    if (checked) {
      setValue('preferred_service_types', [...currentTypes, serviceType]);
    } else {
      setValue('preferred_service_types', currentTypes.filter(type => type !== serviceType));
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Background</h2>
        <p className="text-gray-600">Tell us about your experience and service preferences.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="business_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Business Name"
                placeholder="Your Business Name (optional)"
                error={errors.business_name?.message}
                helper="If you operate as a business"
              />
            )}
          />
          
        </div>

        <Controller
          name="education_level"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Education Level"
              options={EDUCATION_LEVELS}
              error={errors.education_level?.message}
              placeholder="Select your highest education level"
            />
          )}
        />

        {/* Bio */}
        <Controller
          name="bio"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Professional Bio
              </label>
              <textarea
                {...field}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us about your interpreting experience, specializations, and background..."
              />
              {errors.bio && <p className="text-sm text-red-600">{errors.bio.message}</p>}
              <p className="text-sm text-gray-500">
                {(watch('bio') || '').length}/2000 characters
              </p>
            </div>
          )}
        />

        {/* Service Types */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Service Types <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select all types of interpretation services you can provide.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SERVICE_TYPES.map((serviceType) => (
              <div key={serviceType.value} className="border border-gray-200 rounded-lg p-3">
                <Checkbox
                  label={serviceType.label}
                  description={serviceType.description}
                  checked={(watch('preferred_service_types') || []).includes(serviceType.value)}
                  onChange={(e) => handleServiceTypeChange(serviceType.value, e.target.checked)}
                />
              </div>
            ))}
          </div>
          {errors.preferred_service_types && (
            <p className="text-sm text-red-600">{errors.preferred_service_types.message}</p>
          )}
        </div>

        {/* Work Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Work Preferences</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="max_travel_distance"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  max="100"
                  label="Maximum Travel Distance"
                  placeholder="25"
                  error={errors.max_travel_distance?.message}
                  helper="Miles you're willing to travel"
                />
              )}
            />
          </div>
          
          <div className="space-y-3">
            <Controller
              name="willing_to_work_weekends"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  label="Available on weekends"
                  description="Saturday and Sunday availability"
                  checked={value}
                  onChange={onChange}
                />
              )}
            />
            
            <Controller
              name="willing_to_work_evenings"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  label="Available in evenings"
                  description="After 6:00 PM availability"
                  checked={value}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="emergency_contact_name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Contact Name"
                  placeholder="Full name"
                  error={errors.emergency_contact_name?.message}
                  required
                />
              )}
            />
            
            <Controller
              name="emergency_contact_phone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="tel"
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                  error={errors.emergency_contact_phone?.message}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setValue('emergency_contact_phone', formatted);
                  }}
                  required
                />
              )}
            />
          </div>
          
          <Controller
            name="emergency_contact_relationship"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Relationship"
                placeholder="Spouse, Parent, Sibling, etc."
                error={errors.emergency_contact_relationship?.message}
                required
              />
            )}
          />
        </div>

        {/* Tax Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Tax Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="ssn_last_four"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  maxLength="4"
                  label="Last 4 digits of SSN"
                  placeholder="1234"
                  error={errors.ssn_last_four?.message}
                  onChange={(e) => {
                    const formatted = formatSSN(e.target.value);
                    setValue('ssn_last_four', formatted);
                  }}
                  required
                />
              )}
            />
            
            <Controller
              name="tax_classification"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Tax Classification"
                  options={TAX_CLASSIFICATIONS}
                  error={errors.tax_classification?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onPrevious}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Previous
          </button>
          
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Continue
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ProfessionalInfoStep;