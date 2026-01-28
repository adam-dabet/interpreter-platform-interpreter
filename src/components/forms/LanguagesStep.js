import React, { useCallback, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../ui/SearchableSelect';
import Button from '../ui/Button';
import { languagesSchema } from '../../services/validationSchemas';

// Custom validation function that only requires the first language
const customLanguagesSchema = yup.object({
  languages: yup
    .array()
    .of(
      yup.object({
        language_id: yup.string().required('Language is required'),
        rate_amount: yup.string().nullable(),
        rate_unit: yup.string().nullable()
      })
    )
    .min(1, 'At least one language is required')
    .test('at-least-one-complete-language', 'At least one complete language entry is required', function(value) {
      if (!value || value.length === 0) return false;
      
      // Check if the first language has language_id
      const firstLanguage = value[0];
      return firstLanguage && 
             firstLanguage.language_id && 
             firstLanguage.language_id.trim() !== '';
    }),
});

const LanguagesStep = ({ data, onPrevious, onNext, onUpdate, isEditing, parametricData, rejectedFields = [] }) => {
  // Helper to check if field is rejected
  const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

  // Ensure all form fields have proper default values to prevent uncontrolled to controlled warnings
  const defaultValues = {
    languages: data.languages?.length > 0 ? data.languages.map(l => ({
      language_id: l.language_id || '',
      rate_amount: l.rate_amount != null ? String(l.rate_amount) : '',
      rate_unit: l.rate_unit || 'hours'
    })) : [
      { language_id: '', rate_amount: '', rate_unit: 'hours' }
    ]
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(customLanguagesSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'languages'
  });

  const watchedValues = watch();

  // Debug logging
  

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
    // Filter out empty language entries and only submit valid ones
    const validLanguages = formData.languages.filter(lang => 
      lang.language_id && lang.language_id.trim()
    ).map(lang => ({
      language_id: lang.language_id,
      rate_amount: lang.rate_amount,
      rate_unit: lang.rate_unit || 'hours'
    }));
    
    if (validLanguages.length === 0) {
      console.error('No valid languages found');
      return; // Don't submit if no valid languages
    }
    
    // Build language_rates from languages that have a custom rate set (optional per-language rate)
    const language_rates = validLanguages
      .filter(lang => lang.rate_amount != null && String(lang.rate_amount).trim() !== '' && !isNaN(parseFloat(lang.rate_amount)))
      .map(lang => ({
        language_id: lang.language_id,
        rate_amount: parseFloat(lang.rate_amount),
        rate_unit: lang.rate_unit || 'hours'
      }));
    
    onNext({ ...formData, languages: validLanguages, language_rates });
  };

  const addLanguage = () => {
    append({ language_id: '', rate_amount: '', rate_unit: 'hours' });
  };

  const removeLanguage = (index) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Map all languages from parametric data to options format
  // Filter out 'agency' language and 'english' if they exist
  const languageOptions = (parametricData?.languages || [])
    .filter(lang => {
      if (!lang.name) return false;
      const nameLower = lang.name.toLowerCase();
      return nameLower !== 'agency' && nameLower !== 'english';
    })
    .map(lang => ({ value: String(lang.id), label: lang.name }));



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
          <p className="text-gray-600 mb-4">
            Tell us about your language proficiencies and interpreting experience. 
            <span className="text-blue-600 font-medium"> At least one language is required.</span>
          </p>
          
          {/* Requirements Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Requirements</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Select at least one language you can interpret</li>
                    <li>Additional languages are optional</li>
                    <li>You can add or remove extra languages as needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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

              <div className="grid grid-cols-1 gap-4">
                <Controller
                  name={`languages.${index}.language_id`}
                  control={control}
                  render={({ field }) => (
                    <div className={isFieldRejected('languages') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                      <SearchableSelect
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        label="Language"
                        placeholder="Search and select a language..."
                        searchPlaceholder="Search languages..."
                        options={languageOptions}
                        error={errors.languages?.[index]?.language_id?.message || (isFieldRejected('languages') ? 'This field needs to be updated' : '')}
                        required
                      />
                    </div>
                  )}
                />
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Custom rate for this language (optional)</p>
                  <p className="text-xs text-gray-500 mb-2">Some interpreters charge more for rarer languages. Leave blank to use your default service rates.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      name={`languages.${index}.rate_amount`}
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Rate ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 55"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      name={`languages.${index}.rate_unit`}
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Per</label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            {...field}
                            value={field.value ?? 'hours'}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="hours">hour</option>
                            <option value="minutes">minute</option>
                          </select>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Show requirement message only for the first language */}
              {index === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Required:</strong> This is the minimum required language. Additional languages are optional.
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Add Language Button */}
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={addLanguage}
            className="inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Another Language (Optional)
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
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
            >
              Previous
            </Button>
          )}
          
          <div className={isEditing ? 'ml-auto' : ''}>
            <Button
              type="submit"
              disabled={!isValid}
            >
              {isEditing ? 'Save & Return to Review' : 'Next'}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default LanguagesStep;