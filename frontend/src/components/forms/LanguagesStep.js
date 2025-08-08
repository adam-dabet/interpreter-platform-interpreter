import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import { languagesSchema } from '../../services/validationSchemas';
import { PROFICIENCY_LEVELS, COMMON_LANGUAGES } from '../../utils/constants';

const LanguagesStep = ({ data, onPrevious, onNext, onUpdate, parametricData }) => {
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Ensure all form fields have proper default values to prevent uncontrolled to controlled warnings
  const defaultValues = {
    languages: data.languages?.length > 0 ? data.languages : [
      { language_id: '', proficiency_level: '', is_native: false, years_experience: 0 }
    ]
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(languagesSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'languages'
  });

  const watchedValues = watch();

  // Use useCallback to memoize the onUpdate function
  const handleUpdate = useCallback((values) => {
    onUpdate(values);
  }, [onUpdate]);

  // Only update when watchedValues actually change
  useEffect(() => {
    const subscription = watch((value) => {
      handleUpdate(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, handleUpdate]);

  const onSubmit = (formData) => {
    onNext(formData);
  };

  const addLanguage = () => {
    append({ language_id: '', proficiency_level: '', is_native: false, years_experience: 0 });
  };

  const removeLanguage = (index) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim()) {
      const emptyIndex = fields.findIndex(field => !field.language_id);
      if (emptyIndex >= 0) {
        setValue(`languages.${emptyIndex}.language_id`, customLanguage.trim());
      } else {
        append({
          language_id: customLanguage.trim(),
          proficiency_level: '',
          is_native: false,
          years_experience: 0
        });
      }
      setCustomLanguage('');
      setShowCustomInput(false);
    }
  };

  const languageOptions = [
    { value: '', label: 'Select a language...' },
    ...(parametricData?.languages?.map(lang => ({ value: lang.id, label: lang.name })) || []),
    { value: 'other', label: 'Other (specify below)' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Languages & Skills</h2>
        <p className="text-gray-600">
          Tell us about your language proficiencies and interpreting experience.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-gray-200 rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Language {index + 1}
                </h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLanguage(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name={`languages.${index}.language_id`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Language"
                      options={languageOptions}
                      error={errors.languages?.[index]?.language_id?.message}
                      onChange={(e) => {
                        if (e.target.value === 'other') {
                          setShowCustomInput(true);
                          field.onChange('');
                        } else {
                          field.onChange(e.target.value);
                        }
                      }}
                      required
                    />
                  )}
                />

                <Controller
                  name={`languages.${index}.proficiency_level`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Proficiency Level"
                      options={PROFICIENCY_LEVELS}
                      error={errors.languages?.[index]?.proficiency_level?.message}
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name={`languages.${index}.years_experience`}
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      max="50"
                      label="Years of Experience"
                      placeholder="5"
                      error={errors.languages?.[index]?.years_experience?.message}
                      helper="Years interpreting in this language"
                    />
                  )}
                />

                <div className="flex items-end pb-2">
                  <Controller
                    name={`languages.${index}.is_native`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox
                        label="Native Speaker"
                        description="This is your native language"
                        checked={value}
                        onChange={onChange}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Proficiency Description */}
              {watchedValues.languages?.[index]?.proficiency_level && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>
                      {PROFICIENCY_LEVELS.find(
                        level => level.value === watchedValues.languages[index].proficiency_level
                      )?.label}:
                    </strong>{' '}
                    {PROFICIENCY_LEVELS.find(
                      level => level.value === watchedValues.languages[index].proficiency_level
                    )?.description}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Custom Language Input */}
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-blue-200 rounded-lg p-4 bg-blue-50"
          >
            <h4 className="text-md font-medium text-blue-900 mb-3">Add Custom Language</h4>
            <div className="flex space-x-3">
              <Input
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder="Enter language name"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addCustomLanguage}
                disabled={!customLanguage.trim()}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomLanguage('');
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Add Language Button */}
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={addLanguage}
            className="inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Another Language
          </Button>
        </div>

        {/* Form Errors */}
        {errors.languages && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              {errors.languages.message || 'Please fix the errors in your language entries.'}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
          >
            Previous
          </Button>
          
          <Button
            type="submit"
            disabled={fields.some(field => !field.language_id || !field.proficiency_level)}
          >
            Continue
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default LanguagesStep;