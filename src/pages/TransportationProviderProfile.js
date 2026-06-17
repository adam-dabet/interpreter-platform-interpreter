import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  CheckCircleIcon,
  MapPinIcon,
  UserIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PersonalInfoStep from '../components/forms/PersonalInfoStep';
import AddressStep from '../components/forms/AddressStep';
import W9FormStep from '../components/forms/W9FormStep';
import EmailLookupStep from '../components/forms/EmailLookupStep';
import TransportationServiceTypesStep from '../components/forms/transportation/TransportationServiceTypesStep';
import TransportationDocumentsStep from '../components/forms/transportation/TransportationDocumentsStep';
import TransportationReviewStep from '../components/forms/transportation/TransportationReviewStep';
import { transportationProviderAPI, parametricAPI } from '../services/api';

const TRANSPORTATION_STEPS = [
  { id: 1, title: 'Personal Information', description: 'Contact and business details', icon: UserIcon, component: PersonalInfoStep },
  { id: 2, title: 'Address Information', description: 'Business location', icon: MapPinIcon, component: AddressStep },
  { id: 3, title: 'Service Types', description: 'Services and rates', icon: BriefcaseIcon, component: TransportationServiceTypesStep },
  { id: 4, title: 'Documents', description: 'Insurance and license', icon: DocumentTextIcon, component: TransportationDocumentsStep },
  { id: 5, title: 'W-9 Form', description: 'Tax information', icon: DocumentIcon, component: W9FormStep },
  { id: 6, title: 'Review', description: 'Confirm and submit', icon: CheckCircleIcon, component: TransportationReviewStep },
];

const TransportationProviderProfile = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState(new Set([1]));
  const [showEmailLookup, setShowEmailLookup] = useState(false);
  const [isProfileCompletion, setIsProfileCompletion] = useState(false);
  const [completionToken, setCompletionToken] = useState(null);
  const [parametricData, setParametricData] = useState({ usStates: [] });
  const [profileResult, setProfileResult] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    gender: '',
    business_name: '',
    sms_consent: false,
    street_address: '',
    street_address_2: '',
    city: '',
    state_id: '',
    zip_code: '',
    county: '',
    formatted_address: '',
    latitude: null,
    longitude: null,
    place_id: '',
    service_types: [],
    transportation_rates: {},
    commercial_insurance_file: null,
    business_license_file: null,
    w9_entry_method: 'manual',
    w9_data: null,
    terms_accepted: false,
    privacy_policy_accepted: false,
  });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const response = await parametricAPI.getAllParametricData();
        if (response.data?.success) {
          setParametricData(response.data.data);
        } else {
          toast.error('Failed to load form data');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (!token) {
          setShowEmailLookup(true);
          return;
        }
        await loadProfileCompletionData(token);
      } catch (error) {
        console.error('Failed to initialize transportation application:', error);
        toast.error('Failed to load form data');
        setShowEmailLookup(true);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadProfileCompletionData = async (token) => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${apiBase}/profile-completion/validate-token/${token}`);
      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || 'Invalid completion link');
        setShowEmailLookup(true);
        return;
      }

      const data = result.data;
      if (data.providerType !== 'transportation') {
        toast.error('This completion link is for interpreter profiles. Please use the correct application link.');
        setShowEmailLookup(true);
        return;
      }

      const rates = data.transportationRates || {};
      const serviceTypes = Object.keys(rates).filter((key) =>
        ['ambulatory', 'wheelchair', 'bls', 'als'].includes(key)
      );

      setIsProfileCompletion(true);
      setCompletionToken(token);
      setShowEmailLookup(false);
      setFormData((prev) => ({
        ...prev,
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        middle_name: data.middleName || '',
        email: data.email || '',
        phone: data.phone || '',
        street_address: data.address?.street || '',
        street_address_2: data.address?.street2 || '',
        city: data.address?.city || '',
        state_id: data.address?.stateId || '',
        zip_code: data.address?.zipCode || '',
        business_name: data.businessName || '',
        service_types: serviceTypes,
        transportation_rates: rates,
      }));
      toast.success('Welcome! Please complete your transportation provider profile below.');
    } catch (error) {
      console.error('Error loading profile completion data:', error);
      toast.error('Failed to load your profile data. Please contact support.');
      setShowEmailLookup(true);
    }
  };

  const updateFormData = useCallback((stepData) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  }, []);

  const handleNext = (stepData) => {
    if (stepData) updateFormData(stepData);
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setCurrentStep(TRANSPORTATION_STEPS.length);
    } else {
      const nextStep = Math.min(currentStep + 1, TRANSPORTATION_STEPS.length);
      setCurrentStep(nextStep);
      setVisitedSteps((prev) => new Set([...prev, nextStep]));
    }
  };

  const handleUpdate = (stepData) => updateFormData(stepData);

  const handlePrevious = () => {
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setCurrentStep(TRANSPORTATION_STEPS.length);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId < currentStep || visitedSteps.has(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const handleEdit = (stepNumber) => {
    setIsEditingFromReview(true);
    setCurrentStep(stepNumber);
    setVisitedSteps((prev) => new Set([...prev, stepNumber]));
  };

  const handleSubmit = async (finalData) => {
    setIsSubmitting(true);
    try {
      const submissionData = { ...formData, ...finalData };
      const formDataToSubmit = new FormData();

      formDataToSubmit.append('service_types', JSON.stringify(submissionData.service_types || []));
      formDataToSubmit.append('transportation_rates', JSON.stringify(submissionData.transportation_rates || {}));
      formDataToSubmit.append('w9_entry_method', 'manual');
      formDataToSubmit.append('w9_data', JSON.stringify(submissionData.w9_data));
      formDataToSubmit.append('registration_platform', 'web');

      if (submissionData.commercial_insurance_file) {
        formDataToSubmit.append('commercial_insurance', submissionData.commercial_insurance_file);
      }
      if (submissionData.business_license_file) {
        formDataToSubmit.append('business_license', submissionData.business_license_file);
      }

      const skipKeys = new Set([
        'service_types',
        'transportation_rates',
        'w9_data',
        'w9_entry_method',
        'commercial_insurance_file',
        'business_license_file',
        'terms_accepted',
        'privacy_policy_accepted',
      ]);

      Object.keys(submissionData).forEach((key) => {
        if (skipKeys.has(key)) return;
        if (submissionData[key] !== null && submissionData[key] !== undefined) {
          formDataToSubmit.append(key, submissionData[key]);
        }
      });

      const response = completionToken
        ? await transportationProviderAPI.completeProfile(completionToken, formDataToSubmit)
        : await transportationProviderAPI.createProfile(formDataToSubmit);

      if (response.data.success) {
        const successMessage = completionToken
          ? 'Your transportation provider profile has been completed successfully! We will review your information and contact you soon.'
          : 'Transportation provider application submitted successfully! We will review your profile and contact you soon.';
        setProfileResult({ success: true, message: successMessage, data: response.data.data });
        toast.success(successMessage);
      } else {
        throw new Error(response.data.message || 'Failed to submit application');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit application';
      toast.error(errorMessage);
      setProfileResult({ success: false, message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentStepComponent = () => {
    const step = TRANSPORTATION_STEPS[currentStep - 1];
    if (!step) return null;

    const StepComponent = step.component;
    const commonProps = {
      data: formData,
      formData,
      onNext: handleNext,
      onUpdate: handleUpdate,
      onPrevious: handlePrevious,
      isLastStep: currentStep === TRANSPORTATION_STEPS.length,
      isFirstStep: currentStep === 1,
      parametricData,
      isEditing: isEditingFromReview,
      rejectedFields: [],
      requireBusinessName: step.component === PersonalInfoStep,
    };

    if (currentStep === TRANSPORTATION_STEPS.length) {
      return (
        <StepComponent
          {...commonProps}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onEdit={handleEdit}
        />
      );
    }

    if (step.component === PersonalInfoStep) {
      return <StepComponent {...commonProps} requireBusinessName />;
    }

    return <StepComponent {...commonProps} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  if (showEmailLookup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transportation Provider Registration</h1>
            <p className="text-gray-600">
              Enter your email to check if you already have an account in our system.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 max-w-lg mx-auto">
            <EmailLookupStep
              onEmailFound={async (email) => transportationProviderAPI.lookupByEmail(email)}
              onEmailNotFound={() => setShowEmailLookup(false)}
              isLoading={false}
            />
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  if (profileResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isProfileCompletion ? 'Profile Completed!' : 'Application Submitted!'}
          </h1>
          <p className="text-gray-600 mb-6">{profileResult.message}</p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Application ID:</strong> {profileResult.data?.id}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Status:</strong> Pending Review
            </p>
          </div>
          <Button onClick={() => { window.location.href = '/'; }} className="w-full">
            Return to Home
          </Button>
        </motion.div>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isProfileCompletion
              ? 'Complete Your Transportation Provider Profile'
              : 'Transportation Provider Application'}
          </h1>
          <p className="text-gray-600">
            {isProfileCompletion
              ? 'We have your basic information on file. Please verify your details and upload required documents.'
              : 'Join our network of non-emergency medical transportation providers.'}
          </p>
        </div>

        <ProgressBar
          steps={TRANSPORTATION_STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          visitedSteps={visitedSteps}
        />

        <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {getCurrentStepComponent()}
            </motion.div>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default TransportationProviderProfile;
