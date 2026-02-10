import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
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

const ProfileEdit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialStep = location.state?.initialStep || 1;
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingFromReview, setIsEditingFromReview] = useState(false);
    // Mark ALL steps as visited since we're editing existing data - user should be able to navigate freely
    const [visitedSteps, setVisitedSteps] = useState(new Set([1, 2, 3, 4, 5, 6, 7]));
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

    // Load parametric data and current profile on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                // IMPORTANT: Load parametric data FIRST, then profile data
                // This ensures dropdown options are available before setting selected values
                await loadParametricData();
                // Small delay to ensure state is updated
                await new Promise(resolve => setTimeout(resolve, 100));
                await loadCurrentProfile();
                // Another small delay before hiding loading
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const loadParametricData = async () => {
        try {
            console.log('Loading parametric data...');
            const response = await parametricAPI.getAllParametricData();
            console.log('Parametric data response:', response);
            
            if (response.data.success) {
                console.log('Setting parametric data:', response.data.data);
                console.log('📋 Sample service type from parametric:', response.data.data.serviceTypes?.[0]);
                console.log('📋 Service type ID type:', typeof response.data.data.serviceTypes?.[0]?.id);
                setParametricData(response.data.data);
            } else {
                console.error('Failed to load form data:', response.data);
                toast.error('Failed to load form data');
            }
        } catch (error) {
            console.error('Error loading parametric data:', error);
            toast.error('Failed to load form options');
        }
    };

    const loadCurrentProfile = async () => {
        try {
            const response = await interpreterAPI.getProfile();
            console.log('Full API response:', response);
            
            // The API returns {success: true, data: profile}, so we need response.data.data
            const profile = response.data?.data || response.data;
            
            console.log('Loading current profile:', profile);
            console.log('📋 Profile service_types from API:', JSON.stringify(profile.service_types, null, 2));
            console.log('📋 Profile languages from API:', JSON.stringify(profile.languages, null, 2));
            
            // Transform profile data to match rejection resubmission format
            // Rejection data structure: { interpreter, languages, service_types, service_rates, certificates, w9 }
            const transformedData = {
                interpreter: profile,
                languages: (profile.languages || []).map(lang => ({
                    language_id: lang.id
                })),
                service_types: (profile.service_types || []).map(st => ({
                    service_type_id: st.id
                })),
                service_rates: profile.service_rates || [],
                certificates: profile.certificates || [],
                w9: profile.w9_forms?.[0] || null
            };
            
            console.log('📦 Transformed data for prefill:', transformedData);
            
            // Now use EXACT same logic as rejection resubmission (lines 184-272 from InterpreterProfile.js)
            const { interpreter, languages, service_types, service_rates, certificates, w9 } = transformedData;
            
            const newFormData = {
                // Personal Information
                first_name: interpreter.first_name || '',
                last_name: interpreter.last_name || '',
                middle_name: interpreter.middle_name || '',
                email: interpreter.email || '',
                phone: interpreter.phone || '',
                date_of_birth: interpreter.date_of_birth || '',
                gender: interpreter.gender || '',
                sms_consent: interpreter.sms_consent || false,
                
                // Address Information - ALL fields including validation data
                street_address: interpreter.street_address || '',
                street_address_2: interpreter.street_address_2 || '',
                city: interpreter.city || '',
                state_id: interpreter.state_id ? String(interpreter.state_id) : '',
                zip_code: interpreter.zip_code || '',
                county: interpreter.county || '',
                formatted_address: interpreter.formatted_address || '',
                latitude: interpreter.latitude || null,
                longitude: interpreter.longitude || null,
                place_id: interpreter.place_id || '',
                // Address validation flags - ensures address shows as validated
                address_validated: !!(interpreter.latitude && interpreter.longitude && interpreter.place_id),
                
                // Professional Information
                business_name: interpreter.business_name || '',
                availability_notes: interpreter.availability_notes || '',
                bio: interpreter.bio || '',
                years_of_experience: interpreter.years_of_experience || '',
                hourly_rate: interpreter.hourly_rate || '',
                
                // Languages - with all details
                languages: languages?.map(lang => ({
                    language_id: String(lang.language_id),
                    is_primary: lang.is_primary || false
                })) || [],
                
                // Service Types - as array of IDs (string format for proper selection)
                service_types: service_types?.map(st => String(st.service_type_id)) || [],
                
                // Service Rates - with complete rate information
                service_rates: service_rates?.map(rate => ({
                    service_type_id: String(rate.service_type_id),
                    rate_amount: rate.rate_amount,
                    rate_type: rate.rate_type,
                    rate_unit: rate.rate_unit,
                    service_type_name: rate.service_type_name
                })) || [],
                
                // Certificates - with all metadata
                is_certified: certificates && certificates.length > 0 ? true : (certificates?.length === 0 ? false : null),
                certificates: certificates?.map((cert, index) => ({
                    id: cert.id || `existing_${index}_${Date.now()}`, // Ensure unique ID for each certificate
                    certificate_type_id: String(cert.certificate_type_id),
                    certificate_number: cert.certificate_number || '',
                    issuing_organization: cert.issuing_organization || '',
                    issue_date: cert.issue_date || '',
                    expiry_date: cert.expiry_date || '',
                    issuing_state_id: cert.issuing_state_id || '',
                    certificate_type_name: cert.certificate_type_name || '',
                    file_path: cert.file_path || '',
                    file_name: cert.file_name || '',
                    verification_status: cert.verification_status || 'pending',
                    // Don't include actual file object as it's already uploaded
                    _isExisting: true // Flag to indicate this is an existing certificate
                })) || [],
                certificateFiles: [], // Empty as files are already uploaded
                
                // W-9 Form - with complete data
                w9_entry_method: w9 ? 'manual' : '',
                w9_file: null, // No file as it was manual entry or already uploaded
                w9_data: w9 ? {
                    business_name: w9.business_name || '',
                    business_name_alt: w9.business_name_alt || '',
                    tax_classification: w9.tax_classification || '',
                    llc_classification: w9.llc_classification || '',
                    has_foreign_partners: w9.has_foreign_partners || false,
                    exempt_payee_code: w9.exempt_payee_code || '',
                    fatca_exemption_code: w9.fatca_exemption_code || '',
                    ssn: w9.ssn || '',
                    ein: w9.ein || '',
                    address: w9.address || '',
                    city: w9.city || '',
                    state: w9.state || '',
                    zip_code: w9.zip_code || '',
                    signature_name: w9.signature_name || '',
                    signature_date: w9.signature_date || ''
                } : null
            };

            console.log('✅ Profile data loaded, setting form data...');
            console.log('📦 New form data object:', {
                first_name: newFormData.first_name,
                service_types: newFormData.service_types,
                languages: newFormData.languages
            });
            setFormData(newFormData);
            
            console.log('✅ Profile data loaded and form pre-filled successfully');
            console.log('📊 Service types in final form:', newFormData.service_types);
            console.log('📊 Languages in final form:', newFormData.languages);
            
            // Force a re-render by updating a dummy state
            setIsLoading(false);
            setTimeout(() => setIsLoading(false), 0);
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            toast.error('Failed to load your current profile');
            throw error; // Re-throw to be caught by useEffect
        }
    };

    const updateFormData = useCallback((updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const handleNext = async (stepData) => {
        // If stepData is provided, update formData first
        if (stepData) {
            updateFormData(stepData);
        }
        
        // If editing from review, navigate back to review step
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(INTERPRETER_STEPS.length);
            return;
        }
        
        const nextStep = currentStep + 1;
        if (nextStep <= INTERPRETER_STEPS.length) {
            setCurrentStep(nextStep);
            // Mark this step as visited
            setVisitedSteps(prev => new Set([...prev, nextStep]));
        }
    };

    const handleUpdate = (stepData) => {
        updateFormData(stepData);
    };

    const handlePrevious = () => {
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(INTERPRETER_STEPS.length);
        } else {
            setCurrentStep(prev => Math.max(prev - 1, 1));
        }
    };

    const handleStepClick = (stepId) => {
        // Allow free navigation to all steps when editing existing profile
        setCurrentStep(stepId);
    };

    const handleEdit = (stepNumber) => {
        setIsEditingFromReview(true);
        setCurrentStep(stepNumber);
        setVisitedSteps(prev => new Set([...prev, stepNumber]));
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
                    language_id: lang.language_id
                }));
                formDataToSubmit.append('languages', JSON.stringify(transformedLanguages));
            }
            
            // Transform service_types
            if (submissionData.service_types) {
                formDataToSubmit.append('service_types', JSON.stringify(submissionData.service_types));
            }
            
            // Service rates
            if (submissionData.service_rates) {
                formDataToSubmit.append('service_rates', JSON.stringify(submissionData.service_rates));
            }
            
            // Certificates metadata
            if (submissionData.certificates && submissionData.certificates.length > 0) {
                const certificatesMetadata = submissionData.certificates.map(cert => ({
                    certificate_type_id: cert.certificate_type_id,
                    issuing_organization: cert.issuing_organization,
                    issue_date: cert.issue_date,
                    expiry_date: cert.expiry_date,
                    certificate_number: cert.certificate_number
                }));
                formDataToSubmit.append('certificates_metadata', JSON.stringify(certificatesMetadata));
            }
            
            // Handle certificate files
            if (submissionData.certificateFiles && submissionData.certificateFiles.length > 0) {
                submissionData.certificateFiles.forEach((file, index) => {
                    formDataToSubmit.append(`certificate_files`, file);
                });
            }
            
            // Handle W-9 form
            if (submissionData.w9_file) {
                formDataToSubmit.append('w9_file', submissionData.w9_file);
                formDataToSubmit.append('w9_entry_method', 'upload');
            } else if (submissionData.w9_data && submissionData.w9_entry_method === 'manual') {
                formDataToSubmit.append('w9_data', JSON.stringify(submissionData.w9_data));
                formDataToSubmit.append('w9_entry_method', 'manual');
            }
            
            // Add all other fields
            Object.keys(submissionData).forEach(key => {
                if (!['languages', 'service_types', 'service_rates', 'certificates', 'certificateFiles', 'w9_file', 'w9_data', 'w9_entry_method'].includes(key)) {
                    if (submissionData[key] !== null && submissionData[key] !== undefined) {
                        // Handle date formatting
                        if (key === 'date_of_birth' && submissionData[key]) {
                            const date = new Date(submissionData[key]);
                            if (!isNaN(date.getTime())) {
                                formDataToSubmit.append(key, date.toISOString().split('T')[0]);
                            } else {
                                formDataToSubmit.append(key, submissionData[key]);
                            }
                        } else {
                            formDataToSubmit.append(key, submissionData[key]);
                        }
                    }
                }
            });

            console.log('Submitting profile update...');
            
            // Submit to profile update endpoint
            const response = await interpreterAPI.submitProfileUpdate(formDataToSubmit);

            console.log('Profile update response:', response);

            setProfileResult({
                success: true,
                message: 'Profile update submitted successfully! Awaiting admin approval.',
                data: response.data
            });

            toast.success('Profile update submitted! You will be notified once it is reviewed.');

            // Navigate back to profile page after a delay
            setTimeout(() => {
                navigate('/profile');
            }, 2000);

        } catch (error) {
            console.error('Error submitting profile update:', error);
            
            const errorMessage = error.response?.data?.message || 'Failed to submit profile update';
            
            setProfileResult({
                success: false,
                message: errorMessage,
                error: error.response?.data
            });

            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while fetching current profile
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    // Show success message if profile update was submitted
    if (profileResult?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                        <CheckCircleIcon className="mx-auto h-24 w-24 text-green-500" />
                    </motion.div>
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Update Submitted!
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {profileResult.message}
                        </p>
                        <p className="mt-4 text-sm text-gray-500">
                            Your current profile will remain active while your update is being reviewed.
                            You will receive an email notification once the admin has reviewed your changes.
                        </p>
                        <div className="mt-6">
                            <Button onClick={() => navigate('/profile')}>
                                Return to Profile
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const CurrentStepComponent = INTERPRETER_STEPS[currentStep - 1].component;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <Toaster position="top-right" />
            
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Edit Your Profile
                            </h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Any changes you make will require admin approval before being applied.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/profile')}
                        >
                            Cancel & Return to Profile
                        </Button>
                    </div>
                </div>

                {/* Progress Bar */}
                <ProgressBar
                    steps={INTERPRETER_STEPS}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    visitedSteps={visitedSteps}
                />

                {/* Form Steps */}
                <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {currentStep === INTERPRETER_STEPS.length ? (
                                <CurrentStepComponent
                                    data={formData}
                                    formData={formData}
                                    onNext={handleNext}
                                    onUpdate={handleUpdate}
                                    onPrevious={handlePrevious}
                                    isLastStep={true}
                                    isFirstStep={false}
                                    parametricData={parametricData}
                                    onSubmit={handleSubmit}
                                    isSubmitting={isSubmitting}
                                    onEdit={handleEdit}
                                    isResubmission={false}
                                    rejectedFields={[]}
                                />
                            ) : (
                                <CurrentStepComponent
                                    data={formData}
                                    formData={formData}
                                    onNext={handleNext}
                                    onUpdate={handleUpdate}
                                    onPrevious={handlePrevious}
                                    isLastStep={currentStep === INTERPRETER_STEPS.length}
                                    isFirstStep={currentStep === 1}
                                    parametricData={parametricData}
                                    isEditing={isEditingFromReview}
                                    rejectedFields={[]}
                                    isResubmission={false}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ProfileEdit;

