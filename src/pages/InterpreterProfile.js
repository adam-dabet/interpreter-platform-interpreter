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
import CertificatesStep, { requiresCertificateFile } from '../components/forms/CertificatesStep';
import W9FormStep from '../components/forms/W9FormStep';
import ReviewStep from '../components/forms/ReviewStep';
import EmailLookupStep from '../components/forms/EmailLookupStep';
import { interpreterAPI, parametricAPI } from '../services/api';
import { getApiUrl } from '../runtimeEnv';
import {
    parseRejectedFields,
    getRejectedFieldStep,
    formatRejectedFieldLabel,
    getResubmissionWizardStepIds,
} from '../utils/rejectedFields';

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
        title: 'Physical Address',
        description: 'Used for nearby job offers',
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
    const [visitedSteps, setVisitedSteps] = useState(new Set([1])); // Track which steps user has visited
    const [parametricData, setParametricData] = useState({
        languages: [],
        serviceTypes: [],
        certificateTypes: [],
        usStates: []
    });
    
    // Rejection resubmission state
    const [isResubmission, setIsResubmission] = useState(false);
    const [rejectedFields, setRejectedFields] = useState([]);
    const [rejectionNote, setRejectionNote] = useState('');
    const [rejectionToken, setRejectionToken] = useState(null);
    const [originalServiceRates, setOriginalServiceRates] = useState([]);
    
    // Profile completion state (for imported interpreters)
    const [isProfileCompletion, setIsProfileCompletion] = useState(false);
    const [completionToken, setCompletionToken] = useState(null);
    const [importedData, setImportedData] = useState(null);

    // Email lookup: when true, show "enter email to check if in system" before registration form (only when no token in URL)
    const [showEmailLookup, setShowEmailLookup] = useState(false);
    
    // Referral code state
    const [referralCode, setReferralCode] = useState(null);
    const [referrerName, setReferrerName] = useState(null);
    
    const [formData, setFormData] = useState({
        // Personal Information
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        phone: '',
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
        language_rates: [],
        
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

    const reviewStepId = INTERPRETER_STEPS[INTERPRETER_STEPS.length - 1].id;
    const wizardStepIds = isResubmission && rejectedFields.length > 0
        ? getResubmissionWizardStepIds(rejectedFields, reviewStepId)
        : INTERPRETER_STEPS.map((step) => step.id);
    const wizardSteps = INTERPRETER_STEPS.filter((step) => wizardStepIds.includes(step.id));
    const currentWizardStep = INTERPRETER_STEPS.find((step) => step.id === currentStep) || INTERPRETER_STEPS[0];

    // Load parametric data on component mount
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const response = await parametricAPI.getAllParametricData();
                if (response.data.success) {
                    setParametricData(response.data.data);
                } else {
                    toast.error('Failed to load form data');
                }
                await checkForTokens();
            } catch (error) {
                console.error('Error loading form data:', error);
                toast.error('Failed to load form data');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const checkForTokens = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const completionTok = urlParams.get('token');
        const rejectionTok = urlParams.get('rejection_token');
        const refCode = urlParams.get('ref');
        
        // Check and validate referral code if present
        if (refCode) {
            try {
                const response = await fetch(`${getApiUrl()}/referrals/check-code/${refCode}`);
                const result = await response.json();
                if (result.success && result.data?.valid) {
                    setReferralCode(refCode);
                    setReferrerName(result.data.referrer_name);
                    toast.success(`You were referred by ${result.data.referrer_name}!`);
                }
            } catch (error) {
                console.error('Error validating referral code:', error);
            }
        }
        
        // No token: show email lookup first (set immediately to avoid flashing the form)
        if (!completionTok && !rejectionTok) {
            setShowEmailLookup(true);
            return;
        }
        
        if (completionTok) {
            await loadProfileCompletionData(completionTok);
            return;
        }
        
        if (rejectionTok) {
            await loadRejectionData(rejectionTok);
        }
    };

    const loadProfileCompletionData = async (token) => {
        try {
            console.log('Found profile completion token, loading imported data...');
            const response = await fetch(`${getApiUrl()}/profile-completion/validate-token/${token}`);
            const result = await response.json();
            
            if (!result.success) {
                toast.error(result.message || 'Invalid completion link');
                return;
            }
            
            const data = result.data;
            console.log('Loaded imported interpreter data:', data);
            
            setIsProfileCompletion(true);
            setCompletionToken(token);
            setImportedData(data);
            
            // Pre-fill form with imported data
            setFormData(prev => ({
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
                languages: data.languages || [],
                service_types: data.serviceTypes?.map(st => st.service_type_id) || []
            }));
            
            toast.success('Welcome! Please complete your profile information below.');
            
        } catch (error) {
            console.error('Error loading profile completion data:', error);
            toast.error('Failed to load your profile data. Please contact support.');
        }
    };

    const loadRejectionData = async (token) => {
        try {
            console.log('Found rejection token, loading application data...');
            const response = await fetch(`${getApiUrl()}/interpreters/rejection/${token}`);
            const data = await response.json();
            
            if (data.success) {
                setIsResubmission(true);
                setRejectionToken(token);
                const fields = parseRejectedFields(data.data.rejected_fields);
                setRejectedFields(fields);
                setRejectionNote(data.data.rejection_note || '');
                
                // Pre-fill form with original data
                if (data.data.original_submission_data) {
                    prefillFormData(data.data.original_submission_data);
                }

                // Only the rejected steps plus Review are in this wizard.
                setVisitedSteps(new Set(getResubmissionWizardStepIds(fields, INTERPRETER_STEPS[INTERPRETER_STEPS.length - 1].id)));
                const rejectedStepIds = getResubmissionWizardStepIds(fields, INTERPRETER_STEPS[INTERPRETER_STEPS.length - 1].id);
                setCurrentStep(rejectedStepIds[0] || INTERPRETER_STEPS[INTERPRETER_STEPS.length - 1].id);
                
                toast.success('Application loaded! Please update the highlighted fields.');
            } else {
                toast.error('Invalid or expired rejection link');
            }
        } catch (error) {
            console.error('Error loading rejection data:', error);
            toast.error('Failed to load application data');
        }
    };

    const prefillFormData = (originalData) => {
        if (!originalData) return;

        const { interpreter, languages, service_types, service_rates, certificates, w9 } = originalData;

        console.log('Prefilling form data with:', originalData);

        const mappedServiceRates = service_rates?.map(rate => ({
            service_type_id: String(rate.service_type_id),
            rate_amount: rate.rate_amount,
            rate_type: rate.rate_type || (rate.rate_amount != null && rate.rate_amount !== '' ? 'custom' : 'platform'),
            rate_unit: rate.rate_unit,
            service_type_name: rate.service_type_name,
            service_type_code: rate.service_type_code,
            minimum_hours: rate.custom_minimum_hours || rate.minimum_hours,
            interval_minutes: rate.custom_interval_minutes || rate.interval_minutes,
            custom_minimum_hours: rate.custom_minimum_hours || rate.minimum_hours,
            custom_interval_minutes: rate.custom_interval_minutes || rate.interval_minutes,
            custom_second_interval_rate_amount: rate.custom_second_interval_rate_amount || rate.second_interval_rate_amount,
            custom_second_interval_rate_unit: rate.custom_second_interval_rate_unit || rate.second_interval_rate_unit,
            second_interval_rate_amount: rate.second_interval_rate_amount,
            second_interval_rate_unit: rate.second_interval_rate_unit
        })) || [];
        setOriginalServiceRates(mappedServiceRates);

        const mappedServiceTypeIds = service_types?.map(st => String(st.service_type_id)) || [];
        const serviceTypeIds = mappedServiceTypeIds.length > 0
            ? mappedServiceTypeIds
            : [...new Set(mappedServiceRates.map((rate) => String(rate.service_type_id)))];

        // Pre-fill main interpreter data with ALL fields
        setFormData(prev => ({
            ...prev,
            // Personal Information
            first_name: interpreter.first_name || '',
            last_name: interpreter.last_name || '',
            middle_name: interpreter.middle_name || '',
            email: interpreter.email || '',
            phone: interpreter.phone || '',
            gender: interpreter.gender || '',
            sms_consent: interpreter.sms_consent || false, // CRITICAL: SMS consent checkbox
            
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
            service_types: serviceTypeIds,
            
            // Service Rates - with complete rate information so rejected rates stay editable
            service_rates: mappedServiceRates,
            language_rates: (originalData.language_rates || []).map(lr => ({
                service_type_id: String(lr.service_type_id),
                language_id: String(lr.language_id),
                rate_amount: lr.rate_amount,
                rate_unit: lr.rate_unit
            })),
            
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
                signature: w9.signature || w9.signature_name || '',
                signature_name: w9.signature_name || '',
                signature_date: w9.signature_date || '',
                electronic_signature_acknowledgment: !!(w9.electronic_signature_acknowledgment || w9.signature_name || w9.signature)
            } : null
        }));

        console.log('Form data prefilled successfully with ALL fields including sms_consent, address validation, service types, and all original submission data');
    };

    const updateFormData = useCallback((stepData) => {
        setFormData(prev => ({ ...prev, ...stepData }));
    }, []);

    const handleNext = (stepData) => {
        updateFormData(stepData);
        
        // If we're editing from review, go back to review
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(reviewStepId);
        } else {
            const ids = wizardStepIds;
            const idx = ids.indexOf(currentStep);
            const nextStep = ids[idx + 1] || reviewStepId;
            setCurrentStep(nextStep);
            setVisitedSteps(prev => new Set([...prev, nextStep]));
        }
    };

    const handleUpdate = (stepData) => {
        updateFormData(stepData);
    };

    const handlePrevious = () => {
        if (isEditingFromReview) {
            setIsEditingFromReview(false);
            setCurrentStep(reviewStepId);
            return;
        }
        const ids = wizardStepIds;
        const idx = ids.indexOf(currentStep);
        if (idx > 0) {
            setCurrentStep(ids[idx - 1]);
        }
    };

    const handleStepClick = (stepId) => {
        if (!wizardStepIds.includes(stepId)) return;
        if (stepId === currentStep || visitedSteps.has(stepId) || wizardStepIds.indexOf(stepId) < wizardStepIds.indexOf(currentStep)) {
            setCurrentStep(stepId);
        }
    };

    const handleEdit = (stepNumber) => {
        if (isResubmission && !wizardStepIds.includes(stepNumber)) return;
        setIsEditingFromReview(true);
        setCurrentStep(stepNumber);
        setVisitedSteps(prev => new Set([...prev, stepNumber]));
    };

    const handleSubmit = async (finalData) => {
        setIsSubmitting(true);
        
        try {
            const submissionData = { ...formData, ...finalData };

            if (submissionData.is_certified !== false && submissionData.certificates?.length) {
                const certNeedingFile = submissionData.certificates.find(requiresCertificateFile);
                if (certNeedingFile) {
                    toast.error('A certificate file is required for each certification.');
                    setIsSubmitting(false);
                    return;
                }
            }
            
            // Create FormData for file uploads
            const formDataToSubmit = new FormData();
            
            // Transform languages data to match backend expectations
            if (submissionData.languages) {
                const transformedLanguages = submissionData.languages.map(lang => ({
                    language_id: lang.language_id
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
                    expiry_date: cert.expiry_date || null,
                    issuing_state_id: cert.issuing_state_id || null
                }));
                formDataToSubmit.append('certificates_metadata', JSON.stringify(certificateMetadata));

                submissionData.certificates.forEach((cert) => {
                    if (cert.file) {
                        formDataToSubmit.append('certificates', cert.file);
                    }
                });
            }
            if (submissionData.w9_entry_method) {
                formDataToSubmit.append('w9_entry_method', submissionData.w9_entry_method);
                
                if (submissionData.w9_entry_method === 'manual' && submissionData.w9_data) {
                    // Manual W-9 entry
                    formDataToSubmit.append('w9_data', JSON.stringify(submissionData.w9_data));
                } else if (submissionData.w9_entry_method === 'upload' && submissionData.w9_file) {
                    // W-9 file upload
                    formDataToSubmit.append('w9_file', submissionData.w9_file);
                }
            }
            
            if (submissionData.language_rates) {
                formDataToSubmit.append('language_rates', JSON.stringify(submissionData.language_rates));
            }
            
            // Add rejection token if this is a resubmission
            if (rejectionToken) {
                formDataToSubmit.append('rejection_token', rejectionToken);
            }
            
            // Add completion token if this is profile completion
            if (completionToken) {
                formDataToSubmit.append('completion_token', completionToken);
            }
            
            // Add referral code if present
            if (referralCode) {
                formDataToSubmit.append('referral_code', referralCode);
            }

            // Add all other form fields
            Object.keys(submissionData).forEach(key => {
                if (key === 'certificateFiles') {
                    return;
                } else if (key === 'languages' || key === 'service_types' || key === 'certificates' || key === 'w9_data' || key === 'w9_entry_method' || key === 'w9_file' || key === 'language_rates') {
                    // Already handled above
                    return;
                } else if (submissionData[key] !== null && submissionData[key] !== undefined) {
                    // Handle service rates formatting
                    if (key === 'service_rates' && submissionData[key]) {
                        formDataToSubmit.append(key, JSON.stringify(submissionData[key]));
                    }
                    else {
                        formDataToSubmit.append(key, submissionData[key]);
                    }
                }
            });

            // Add registration platform identifier
            formDataToSubmit.append('registration_platform', 'web');

            // Debug: Log the form data being submitted
            console.log('InterpreterProfile - Submission data:', submissionData);
            console.log('InterpreterProfile - FormData entries:');
            for (let [key, value] of formDataToSubmit.entries()) {
                console.log(`${key}:`, value);
            }

            // Use appropriate endpoint based on whether this is profile completion or new application
            let response;
            if (completionToken) {
                response = await fetch(`${getApiUrl()}/profile-completion/submit/${completionToken}`, {
                    method: 'POST',
                    body: formDataToSubmit,
                });
                const result = await response.json();
                response = { data: result };
            } else {
                // Normal new application
                response = await interpreterAPI.createProfile(formDataToSubmit);
            }
            
            if (response.data.success) {
                const successMessage = isProfileCompletion 
                    ? 'Profile completed successfully! Your profile is now under review. You will receive an email once approved with instructions to set up your password.'
                    : 'Interpreter application submitted successfully! We will review your profile and contact you soon.';
                    
                setProfileResult({
                    success: true,
                    message: successMessage,
                    data: response.data.data
                });
                
                toast.success(successMessage);
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

            const unchangedFields = parseRejectedFields(error.response?.data?.unchanged_fields);
            if (unchangedFields.length > 0) {
                const labels = unchangedFields.map((field) =>
                    formatRejectedFieldLabel(field, parametricData?.serviceTypes, originalServiceRates)
                );
                errorMessage = `Please update these rejected fields before resubmitting: ${labels.join(', ')}`;
                const firstUnchangedStep = Math.min(...unchangedFields.map(getRejectedFieldStep));
                setCurrentStep(firstUnchangedStep);
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
        const step = INTERPRETER_STEPS.find((s) => s.id === currentStep);
        if (!step) return null;

        const StepComponent = step.component;
        
        const commonProps = {
            data: formData,
            formData,
            onNext: handleNext,
            onUpdate: handleUpdate,
            onPrevious: handlePrevious,
            isLastStep: currentStep === reviewStepId,
            isFirstStep: currentStep === wizardStepIds[0],
            parametricData,
            isEditing: isEditingFromReview, // User is editing only if they came from review step
            rejectedFields: rejectedFields || [], // Pass rejected fields for highlighting
            originalServiceRates,
            isResubmission
        };

        if (currentStep === reviewStepId) {
            // Review step — W-9 is required for new applications, but not on
            // field-specific resubmissions unless W-9 itself was flagged.
            const w9WasRejected = rejectedFields.some(
                (field) => field === 'w9_data' || String(field).startsWith('w9_')
            );
            const w9Required = isResubmission
                ? w9WasRejected
                : (!isProfileCompletion || !importedData?.isAgency);
            return (
                <StepComponent
                    {...commonProps}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    onEdit={handleEdit}
                    w9Required={w9Required}
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

    // Email lookup step: "Are you already in our system?" — only when visiting /apply with no token
    if (showEmailLookup) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Provider Registration
                        </h1>
                        <p className="text-gray-600">
                            Enter your email to see if we already have your information in our system.
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 max-w-lg mx-auto">
                        <EmailLookupStep
                            onEmailFound={async (email) => {
                                const result = await interpreterAPI.lookupByEmail(email);
                                return result;
                            }}
                            onEmailNotFound={() => setShowEmailLookup(false)}
                            isLoading={false}
                        />
                    </div>
                </div>
                <Toaster position="top-right" />
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
                        {isResubmission ? 'Application Resubmitted!' : 'Profile Created Successfully!'}
                    </h1>
                    
                    <p className="text-gray-600 mb-6">
                        {isResubmission
                            ? 'Your updated application has been submitted for review. You will receive an email once the review is complete.'
                            : 'Your interpreter profile has been submitted for review. You\'ll receive an email notification once the review process is complete.'}
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
                        {isResubmission ? 'Update Your Application' : 'Create Interpreter Profile'}
                    </h1>
                    <p className="text-gray-600">
                        {isResubmission 
                            ? 'Update the flagged items below, then review and resubmit.'
                            : 'Complete your professional interpreter profile to join our network'
                        }
                    </p>
                </div>

                {/* Referral Banner */}
                {referralCode && referrerName && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-700">
                                    You were referred by <span className="font-semibold">{referrerName}</span>! 
                                    Complete your profile and 3 jobs to help them earn a reward.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Notice Banner */}
                {isResubmission && rejectionNote && (
                    <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-lg shadow-md">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                                    Updates Required
                                </h3>
                                <p className="text-amber-700 mb-3">
                                    {rejectionNote}
                                </p>
                                {rejectedFields.length > 0 && (
                                    <div className="bg-white bg-opacity-50 rounded p-3 mt-3">
                                        <p className="text-sm font-medium text-amber-800 mb-2">
                                            Please update these fields:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {rejectedFields.map(field => (
                                                <span
                                                    key={field}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer"
                                                    onClick={() => setCurrentStep(getRejectedFieldStep(field))}
                                                >
                                                    {formatRejectedFieldLabel(field, parametricData?.serviceTypes, originalServiceRates)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Steps */}
                <div className="mb-8">
                    <ProgressBar 
                        steps={wizardSteps}
                        currentStep={currentStep}
                        visitedSteps={visitedSteps}
                        onStepClick={handleStepClick}
                    />
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        {/* Step Header */}
                        <div className="flex items-center mb-6">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mr-4">
                                {React.createElement(currentWizardStep.icon, {
                                    className: "w-6 h-6 text-blue-600"
                                })}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {currentWizardStep.title}
                                </h2>
                                <p className="text-gray-600">
                                    {isResubmission && currentStep !== reviewStepId
                                        ? 'Update the flagged item, then continue to review'
                                        : currentWizardStep.description}
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