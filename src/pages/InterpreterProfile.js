import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircleIcon, MapPinIcon, UserIcon, DocumentTextIcon, LanguageIcon, BriefcaseIcon, DocumentIcon } from '@heroicons/react/24/outline';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PersonalInfoStep from '../components/forms/PersonalInfoStep';
import AddressStep from '../components/forms/AddressStep';
import LanguagesStep from '../components/forms/LanguagesStep';
import ServiceTypesStep from '../components/forms/ServiceTypesStep';
import CertificatesStep from '../components/forms/CertificatesStep';
import W9FormStep from '../components/forms/W9FormStep';
import ReviewStep from '../components/forms/ReviewStep';
import { interpreterAPI, parametricAPI } from '../services/api';

const INTERPRETER_STEPS = [
    {
        id: 1,
        title: 'Personal Information',
        description: 'Basic personal details',
        icon: UserIcon,
        component: PersonalInfoStep
    },
    {
        id: 2,
        title: 'Address Information',
        description: 'Location and contact details',
        icon: MapPinIcon,
        component: AddressStep
    },
    {
        id: 3,
        title: 'Languages',
        description: 'Language proficiencies',
        icon: LanguageIcon,
        component: LanguagesStep
    },
    {
        id: 4,
        title: 'Certificates',
        description: 'Qualifications and documents',
        icon: DocumentTextIcon,
        component: CertificatesStep
    },
    {
        id: 5,
        title: 'Service Types',
        description: 'Areas of expertise',
        icon: BriefcaseIcon,
        component: ServiceTypesStep
    },
    {
        id: 6,
        title: 'W-9 Form',
        description: 'Tax information',
        icon: DocumentIcon,
        component: W9FormStep
    },
    {
        id: 7,
        title: 'Review',
        description: 'Confirm and submit',
        icon: CheckCircleIcon,
        component: ReviewStep
    }
];

const InterpreterProfile = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingFromReview, setIsEditingFromReview] = useState(false);
    const [parametricData, setParametricData] = useState({
        languages: [],
        serviceTypes: [],
        certificateTypes: [],
        usStates: []
    });
    
    const [formData, setFormData] = useState({
        // Personal Information
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        
        // Address Information
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
        
        // Professional Information
        business_name: '',
        availability_notes: '',
        bio: '',
        
        // Languages (array of objects)
        languages: [],
        
        // Service Types (array of IDs)
        service_types: [],
        
        // Service Rates (array of objects with rate info for each service type)
        service_rates: [],
        
        // Certificates (files and data)
        is_certified: null,
        certificates: [],
        certificateFiles: [],
        
        // W-9 Form
        w9_entry_method: '',
        w9_file: null,
        w9_data: null
    });

    const [profileResult, setProfileResult] = useState(null);

    // Load parametric data on component mount
    useEffect(() => {
        loadParametricData();
    }, []);

    const loadParametricData = async () => {
        try {
            setIsLoading(true);
            console.log('Loading parametric data...');
            const response = await parametricAPI.getAllParametricData();
            console.log('Parametric data response:', response);
            
            if (response.data.success) {
                console.log('Setting parametric data:', response.data.data);
                console.log('InterpreterProfile - US States:', response.data.data.usStates);
                setParametricData(response.data.data);
            } else {
                console.error('Failed to load form data:', response.data);
                toast.error('Failed to load form data');
            }
        } catch (error) {
            console.error('Error loading parametric data:', error);
            toast.error('Failed to load form data');
        } finally {
            setIsLoading(false);
        }
    };

    const updateFormData = useCallback((stepData) => {
        setFormData(prev => ({ ...prev, ...stepData }));
    }, []);

    const handleNext = (stepData) => {
        updateFormData(stepData);
        
        // If we're editing from review, go back to review
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(INTERPRETER_STEPS.length);
        } else {
            // Normal flow - go to next step
            setCurrentStep(prev => Math.min(prev + 1, INTERPRETER_STEPS.length));
        }
    };

    const handleUpdate = (stepData) => {
        updateFormData(stepData);
    };

    const handlePrevious = () => {
        // If we're editing from review and going back, go to review
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(INTERPRETER_STEPS.length);
        } else {
            setCurrentStep(prev => Math.max(prev - 1, 1));
        }
    };

    const handleStepClick = (stepId) => {
        if (stepId < currentStep) {
            setCurrentStep(stepId);
        }
    };

    const handleEdit = (stepNumber) => {
        setIsEditingFromReview(true);
        setCurrentStep(stepNumber);
    };

    const handleSubmit = async (finalData) => {
        setIsSubmitting(true);
        
        try {
            const submissionData = { ...formData, ...finalData };
            
            // Create FormData for file uploads
            const formDataToSubmit = new FormData();
            
            // Transform languages data to match backend expectations
            if (submissionData.languages) {
                const transformedLanguages = submissionData.languages.map(lang => ({
                    language_id: lang.language_id,
                    proficiency_level: lang.proficiency_level,
                    is_native: lang.is_native || false,
                }));
                formDataToSubmit.append('languages', JSON.stringify(transformedLanguages));
            }
            
            // Transform service_types if needed
            if (submissionData.service_types) {
                formDataToSubmit.append('service_types', JSON.stringify(submissionData.service_types));
            }
            
            // Add certificate metadata if we have certificates
            if (submissionData.certificates && submissionData.certificates.length > 0) {
                // Send the certificate metadata as JSON
                const certificateMetadata = submissionData.certificates.map(cert => ({
                    certificate_type_id: cert.certificate_type_id,
                    certificate_number: cert.certificate_number || '',
                    issuing_organization: cert.issuing_organization || '',
                    issue_date: cert.issue_date || null,
                    expiry_date: cert.expiry_date || null
                }));
                formDataToSubmit.append('certificates_metadata', JSON.stringify(certificateMetadata));
            }
            
            // Handle W-9 form data
            if (submissionData.w9_entry_method) {
                formDataToSubmit.append('w9_entry_method', submissionData.w9_entry_method);
                
                if (submissionData.w9_entry_method === 'upload' && submissionData.w9_file) {
                    formDataToSubmit.append('w9_file', submissionData.w9_file);
                } else if (submissionData.w9_entry_method === 'manual' && submissionData.w9_data) {
                    formDataToSubmit.append('w9_data', JSON.stringify(submissionData.w9_data));
                }
            }
            
            // Add all other form fields
            Object.keys(submissionData).forEach(key => {
                if (key === 'certificateFiles') {
                    // Handle file uploads
                    submissionData[key].forEach((file, index) => {
                        formDataToSubmit.append('certificates', file);
                    });
                } else if (key === 'languages' || key === 'service_types' || key === 'certificates' || key === 'w9_file' || key === 'w9_data' || key === 'w9_entry_method') {
                    // Already handled above
                    return;
                } else if (submissionData[key] !== null && submissionData[key] !== undefined) {
                    // Handle date formatting for date_of_birth
                    if (key === 'date_of_birth' && submissionData[key]) {
                        const date = new Date(submissionData[key]);
                        if (!isNaN(date.getTime())) {
                            formDataToSubmit.append(key, date.toISOString().split('T')[0]);
                        } else {
                            formDataToSubmit.append(key, submissionData[key]);
                        }
                    }
                    // Handle service rates formatting
                    else if (key === 'service_rates' && submissionData[key]) {
                        formDataToSubmit.append(key, JSON.stringify(submissionData[key]));
                    }
                    else {
                        formDataToSubmit.append(key, submissionData[key]);
                    }
                }
            });

            // Debug: Log the form data being submitted
            console.log('InterpreterProfile - Submission data:', submissionData);
            console.log('InterpreterProfile - FormData entries:');
            for (let [key, value] of formDataToSubmit.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await interpreterAPI.createProfile(formDataToSubmit);
            
            if (response.data.success) {
                setProfileResult({
                    success: true,
                    message: 'Interpreter profile created successfully!',
                    data: response.data.data
                });
                
                toast.success('Profile created successfully!');
            } else {
                throw new Error(response.data.message || 'Failed to create profile');
            }
            
        } catch (error) {
            console.error('Profile submission error:', error);
            
            let errorMessage = 'Failed to create profile';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            
            setProfileResult({
                success: false,
                message: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCurrentStepComponent = () => {
        const step = INTERPRETER_STEPS[currentStep - 1];
        if (!step) return null;

        const StepComponent = step.component;
        
        const commonProps = {
            data: formData,
            formData,
            onNext: handleNext,
            onUpdate: handleUpdate,
            onPrevious: handlePrevious,
            isLastStep: currentStep === INTERPRETER_STEPS.length,
            isFirstStep: currentStep === 1,
            parametricData,
            isEditing: isEditingFromReview // User is editing only if they came from review step
        };

        console.log('Rendering step with props:', {
            currentStep,
            parametricData,
            formData,
            isEditing: isEditingFromReview
        });

        if (currentStep === INTERPRETER_STEPS.length) {
            // Review step
            return (
                <StepComponent
                    {...commonProps}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    onEdit={handleEdit}
                />
            );
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

    // Success page
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
                        Profile Created Successfully!
                    </h1>
                    
                    <p className="text-gray-600 mb-6">
                        Your interpreter profile has been submitted for review. You'll receive an email notification once the review process is complete.
                    </p>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                            <strong>Profile ID:</strong> {profileResult.data?.id}
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                            <strong>Status:</strong> {profileResult.data?.status || 'Draft'}
                        </p>
                    </div>
                    
                    <Button
                        onClick={() => window.location.href = '/'}
                        className="w-full"
                    >
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
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Interpreter Profile
                    </h1>
                    <p className="text-gray-600">
                        Complete your professional interpreter profile to join our network
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <ProgressBar 
                        steps={INTERPRETER_STEPS}
                        currentStep={currentStep}
                        onStepClick={handleStepClick}
                    />
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        {/* Step Header */}
                        <div className="flex items-center mb-6">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mr-4">
                                {React.createElement(INTERPRETER_STEPS[currentStep - 1]?.icon, {
                                    className: "w-6 h-6 text-blue-600"
                                })}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {INTERPRETER_STEPS[currentStep - 1]?.title}
                                </h2>
                                <p className="text-gray-600">
                                    {INTERPRETER_STEPS[currentStep - 1]?.description}
                                </p>
                            </div>
                        </div>

                        {/* Step Component */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {getCurrentStepComponent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Error Display */}
                {profileResult && !profileResult.success && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                        <p className="text-red-800">{profileResult.message}</p>
                    </motion.div>
                )}
            </div>
            
            <Toaster position="top-right" />
        </div>
    );
};

export default InterpreterProfile;