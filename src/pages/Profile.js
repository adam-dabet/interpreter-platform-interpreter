import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircleIcon, MapPinIcon, UserIcon, DocumentTextIcon, LanguageIcon, BriefcaseIcon, DocumentIcon, PencilIcon, ClockIcon, XMarkIcon, UsersIcon } from '@heroicons/react/24/outline';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { interpreterAPI } from '../services/api';

const PROFILE_STEPS = [
    {
        id: 1,
        title: 'Personal Information',
        description: 'Basic personal details',
        icon: UserIcon
    },
    {
        id: 2,
        title: 'Address Information',
        description: 'Location and contact details',
        icon: MapPinIcon
    },
    {
        id: 3,
        title: 'Languages',
        description: 'Language proficiencies',
        icon: LanguageIcon
    },
    {
        id: 4,
        title: 'Certificates',
        description: 'Qualifications and documents',
        icon: DocumentTextIcon
    },
    {
        id: 5,
        title: 'Service Types',
        description: 'Areas of expertise',
        icon: BriefcaseIcon
    },
    {
        id: 6,
        title: 'W-9 Form',
        description: 'Tax information',
        icon: DocumentIcon
    },
    {
        id: 7,
        title: 'Summary',
        description: 'Profile overview',
        icon: CheckCircleIcon
    }
];

const Profile = () => {
    const navigate = useNavigate();
    const { profile, isLoading: authLoading } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [checkingUpdate, setCheckingUpdate] = useState(true);

    useEffect(() => {
        checkPendingUpdate();
    }, []);

    const checkPendingUpdate = async () => {
        try {
            const response = await interpreterAPI.getPendingUpdate();
            // API returns {success: true, data: updateOrNull}
            const pendingData = response.data?.data || null;
            console.log('Pending update data:', pendingData);
            setPendingUpdate(pendingData);
        } catch (error) {
            console.error('Error checking pending update:', error);
            setPendingUpdate(null); // Set to null on error
        } finally {
            setCheckingUpdate(false);
        }
    };

    const handleCancelUpdate = async () => {
        if (!window.confirm('Are you sure you want to cancel your pending profile update?')) {
            return;
        }

        try {
            await interpreterAPI.cancelPendingUpdate();
            setPendingUpdate(null);
            toast.success('Pending profile update cancelled');
        } catch (error) {
            console.error('Error cancelling update:', error);
            toast.error('Failed to cancel pending update');
        }
    };

    const handleEditProfile = () => {
        if (pendingUpdate) {
            toast.error('You already have a pending update. Please wait for admin approval or cancel it first.');
            return;
        }
        // Navigate to edit page, passing current step via state
        navigate('/profile/edit', { state: { initialStep: currentStep } });
    };

    const handleStepClick = (stepId) => {
        setCurrentStep(stepId);
    };

    if (authLoading || checkingUpdate) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    const formatDateDisplay = (dateValue) => {
        if (!dateValue) return 'Not specified';
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? 'Not specified' : parsed.toLocaleDateString();
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderPersonalInfo();
            case 2:
                return renderAddressInfo();
            case 3:
                return renderLanguages();
            case 4:
                return renderCertificates();
            case 5:
                return renderServiceTypes();
            case 6:
                return renderW9Form();
            case 7:
                return renderSummary();
            default:
                return null;
        }
    };

    const renderPersonalInfo = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.first_name || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.last_name || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.middle_name || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.email || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.phone || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">
                        {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.gender || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.business_name || 'Not provided'}</p>
                </div>
            </div>
            {profile?.bio && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.bio}</p>
                </div>
            )}
            {profile?.availability_notes && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Availability Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.availability_notes}</p>
                </div>
            )}
        </div>
    );

    const renderAddressInfo = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.street_address || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address 2</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.street_address_2 || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.city || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.state_name || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.zip_code || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">County</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.county || 'Not provided'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Service Radius</label>
                    <p className="mt-1 text-sm text-gray-900">{profile?.service_radius_miles || 25} miles</p>
                </div>
            </div>
        </div>
    );

    const renderLanguages = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Languages</h3>
            {profile?.languages && profile.languages.length > 0 ? (
                <div className="space-y-3">
                    {profile.languages.map((lang, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">
                                {lang.name || lang.native_name || 'Unknown Language'}
                            </span>
                            {lang.is_primary && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    Primary
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500">No languages added yet</p>
            )}
        </div>
    );

    const renderCertificates = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Certificates</h3>
            {profile?.certificates && profile.certificates.length > 0 ? (
                <div className="space-y-3">
                    {profile.certificates.map((cert, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                    {cert.certificate_type_name || 'Unknown Certificate'}
                                </h4>
                                <div className="mt-2 space-y-1 text-xs text-gray-600">
                                    <p>
                                        <span className="font-medium text-gray-700">Number:</span>{' '}
                                        {cert.certificate_number || 'Not specified'}
                                    </p>
                                    <p>
                                        <span className="font-medium text-gray-700">Issuer:</span>{' '}
                                        {cert.issuing_organization || 'Not specified'}
                                    </p>
                                    <p>
                                        <span className="font-medium text-gray-700">Issued:</span>{' '}
                                        {formatDateDisplay(cert.issue_date)}
                                    </p>
                                    <p>
                                        <span className="font-medium text-gray-700">Expires:</span>{' '}
                                        {formatDateDisplay(cert.expiry_date)}
                                    </p>
                                </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                cert.verification_status === 'verified' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {cert.verification_status || 'pending'}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No certifications</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        No certificates have been added to your profile yet.
                    </p>
                </div>
            )}
        </div>
    );

    const renderServiceTypes = () => {
        const normalizedServiceRates = Array.isArray(profile?.service_rates)
            ? profile.service_rates.filter(Boolean)
            : [];
        const normalizedServiceTypes = Array.isArray(profile?.service_types)
            ? profile.service_types.filter(Boolean)
            : [];
        
        const displayServices = normalizedServiceRates.length > 0
            ? normalizedServiceRates
            : normalizedServiceTypes;

        if (displayServices.length === 0) {
            return (
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">Service Types & Rates</h3>
                    <p className="text-sm text-gray-500">No service types added yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Service Types & Rates</h3>
                <div className="space-y-3">
                    {displayServices.map((service, index) => {
                        const serviceId = service?.service_type_id ?? service?.id ?? service?.service_type?.id;
                        const rate = normalizedServiceRates.length > 0
                            ? service
                            : normalizedServiceRates.find(r => 
                                serviceId != null &&
                                String(r?.service_type_id) === String(serviceId)
                            );
                        const serviceName = service?.service_type_name || service?.name || service?.title || 'Unknown Service';
                        const serviceCode = service?.service_type_code || service?.code || service?.identifier || '';
                        
                        return (
                            <div key={serviceId || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {serviceName}
                                    </span>
                                    {serviceCode && (
                                        <p className="text-xs text-gray-500">{serviceCode}</p>
                                    )}
                                </div>
                                {rate && rate.rate_amount != null ? (
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-gray-900">
                                            ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : rate.rate_unit === '3hours' ? '3hr' : rate.rate_unit === '6hours' ? '6hr' : rate.rate_unit || 'hour'}
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            {rate.rate_type === 'custom' ? 'Custom Rate' : 'Platform Rate'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">Rate not set</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderW9Form = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">W-9 Tax Information</h3>
            {profile?.w9_forms && profile.w9_forms.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Business Name</label>
                            <p className="mt-1 text-sm text-gray-900">{profile.w9_forms[0].business_name || 'Not provided'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tax Classification</label>
                            <p className="mt-1 text-sm text-gray-900">{profile.w9_forms[0].tax_classification || 'Not provided'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SSN/EIN</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {profile.w9_forms[0].ssn ? '***-**-****' : profile.w9_forms[0].ein ? '**-*******' : 'Not provided'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Entry Method</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {profile.w9_forms[0].entry_method === 'manual' ? 'Manual Entry' : 'File Upload'}
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            W-9 form submitted on {new Date(profile.w9_forms[0].created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No W-9 on file</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        No W-9 tax form has been submitted yet.
                    </p>
                </div>
            )}
        </div>
    );

    const renderSummary = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Profile Summary</h3>
            <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                {/* Personal Info Summary */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Personal Information</h4>
                    <p className="text-sm text-gray-900">
                        {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{profile?.email}</p>
                    <p className="text-sm text-gray-600">{profile?.phone}</p>
                </div>

                {/* Address Summary */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
                    <p className="text-sm text-gray-900">
                        {profile?.street_address}
                        {profile?.street_address_2 && <>, {profile.street_address_2}</>}
                    </p>
                    <p className="text-sm text-gray-600">
                        {profile?.city}, {profile?.state_name} {profile?.zip_code}
                    </p>
                </div>

                {/* Languages Summary */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Languages</h4>
                    <p className="text-sm text-gray-900">
                        {profile?.languages && profile.languages.length > 0
                            ? profile.languages.map(l => l.name || l.native_name).join(', ')
                            : 'None specified'}
                    </p>
                </div>

                {/* Service Types Summary */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Service Types</h4>
                    <p className="text-sm text-gray-900">
                        {profile?.service_types && profile.service_types.length > 0
                            ? profile.service_types.map(st => st.name).join(', ')
                            : 'None specified'}
                    </p>
                </div>

                {/* Status */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Account Status</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            profile?.profile_status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {profile?.profile_status || 'Pending'}
                        </span>
                        {profile?.is_preferred_provider && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Preferred Provider
                            </span>
                        )}
                    </div>
                    {profile?.is_preferred_provider && (
                        <p className="mt-2 text-xs text-gray-600">
                            You can self-assign to jobs when you mark availability
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                            {profile?.is_agency && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                    <BriefcaseIcon className="h-4 w-4 mr-1" />
                                    Agency
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            {profile?.is_agency 
                                ? 'View your agency profile information' 
                                : 'View your interpreter profile information'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {profile?.is_agency && (
                            <Button variant="outline" onClick={() => navigate('/profile/agency-members')}>
                                <UsersIcon className="h-4 w-4 mr-2" />
                                Manage Team
                            </Button>
                        )}
                        <Button onClick={handleEditProfile}>
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                </div>

                {/* Pending Update Banner */}
                {pendingUpdate && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6"
                    >
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ClockIcon className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm text-yellow-700">
                                    <strong>Profile Update Pending</strong> - You have a profile update waiting for admin approval.
                                    Your current profile will remain active until the update is approved.
                                </p>
                                <p className="mt-2 text-xs text-yellow-600">
                                    Submitted: {new Date(pendingUpdate.submitted_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="ml-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelUpdate}
                                >
                                    <XMarkIcon className="h-4 w-4 mr-1" />
                                    Cancel Update
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Progress Bar */}
                <ProgressBar
                    steps={PROFILE_STEPS}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    visitedSteps={new Set([1, 2, 3, 4, 5, 6, 7])} // All steps are accessible in view mode
                />

                {/* Step Content */}
                <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                            disabled={currentStep === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentStep(prev => Math.min(prev + 1, PROFILE_STEPS.length))}
                            disabled={currentStep === PROFILE_STEPS.length}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
