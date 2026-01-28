import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import toast from 'react-hot-toast';
import { RATE_UNITS } from '../../utils/constants';

const ServiceTypesStep = ({ formData, onNext, onPrevious, isFirstStep, isEditing, parametricData, onUpdate, rejectedFields = [] }) => {
    const [selectedServiceTypes, setSelectedServiceTypes] = useState(formData.service_types || []);
    const [serviceRates, setServiceRates] = useState({});
    const [languageRates, setLanguageRates] = useState({}); // { [serviceTypeId]: { [languageId]: { rate_amount, rate_unit } } }
    const [errors, setErrors] = useState({});
    const [showPreferredProviderModal, setShowPreferredProviderModal] = useState(false);
    
    // Helper to check if field is rejected
    const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

    // Show preferred provider modal on first load (only once)
    useEffect(() => {
        const hasSeenModal = sessionStorage.getItem('hasSeenPreferredProviderModal');
        if (!hasSeenModal && !isEditing) {
            // Delay showing modal slightly so user can see the page first
            const timer = setTimeout(() => {
                setShowPreferredProviderModal(true);
                sessionStorage.setItem('hasSeenPreferredProviderModal', 'true');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    // Sync selectedServiceTypes with formData.service_types when it changes (e.g., from prefillFormData)
    useEffect(() => {
        if (formData.service_types && Array.isArray(formData.service_types) && formData.service_types.length > 0) {
            // Ensure all IDs are strings for consistency
            const stringIds = formData.service_types.map(id => String(id));
            setSelectedServiceTypes(stringIds);
        }
    }, [formData.service_types]);

    // Initialize service rates from formData
    useEffect(() => {
        if (formData.service_rates && parametricData?.serviceTypes) {
            // Convert array format to object format if needed
            let ratesObject = {};
            
            if (Array.isArray(formData.service_rates)) {
                // Convert array to object, handling both string and number IDs
                formData.service_rates.forEach(rate => {
                    if (rate.service_type_id) {
                        // Use string ID as key for consistency
                        const key = String(rate.service_type_id);
                        ratesObject[key] = {
                            ...rate,
                            service_type_id: key // Ensure service_type_id is string
                        };
                    }
                });
            } else if (typeof formData.service_rates === 'object') {
                ratesObject = formData.service_rates;
            }
            
            setServiceRates(ratesObject);
        }
    }, [formData.service_rates, parametricData?.serviceTypes]);

    // Initialize language rates from formData
    useEffect(() => {
        if (formData.language_rates && Array.isArray(formData.language_rates)) {
            const langRatesObj = {};
            formData.language_rates.forEach(lr => {
                const stKey = String(lr.service_type_id);
                const langKey = String(lr.language_id);
                if (!langRatesObj[stKey]) {
                    langRatesObj[stKey] = {};
                }
                langRatesObj[stKey][langKey] = {
                    rate_amount: String(lr.rate_amount || ''),
                    rate_unit: lr.rate_unit || 'hours'
                };
            });
            setLanguageRates(langRatesObj);
        }
    }, [formData.language_rates]);

    // Ensure all selected service types have rates (create defaults if missing)
    useEffect(() => {
        if (selectedServiceTypes.length > 0 && parametricData?.serviceTypes) {
            setServiceRates(prev => {
                const updated = { ...prev };
                let hasChanges = false;

                selectedServiceTypes.forEach(serviceTypeId => {
                    const key = String(serviceTypeId);
                    // If this service type doesn't have a rate, create a default one
                    if (!updated[key]) {
                        const serviceType = parametricData.serviceTypes.find(st => 
                            String(st.id) === key || st.id === serviceTypeId
                        );
                        
                        if (serviceType) {
                            updated[key] = {
                                service_type_id: key,
                                rate_type: 'platform',
                                rate_amount: getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount),
                                rate_unit: serviceType.platform_rate_unit,
                                minimum_hours: serviceType.platform_minimum_hours,
                                interval_minutes: serviceType.platform_interval_minutes,
                                second_interval_rate_amount: serviceType.platform_second_interval_rate_amount,
                                second_interval_rate_unit: serviceType.platform_second_interval_rate_unit,
                                custom_minimum_hours: null,
                                custom_interval_minutes: null,
                                custom_second_interval_rate_amount: null,
                                custom_second_interval_rate_unit: null
                            };
                            hasChanges = true;
                        }
                    }
                });

                return hasChanges ? updated : prev;
            });
        }
    }, [selectedServiceTypes, parametricData?.serviceTypes]);

    // Safety check for parametricData
    if (!parametricData) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <p className="text-gray-500">Loading form data...</p>
                </div>
            </div>
        );
    }

    // Get language-specific rate for phone and document services
    const getLanguageSpecificRate = (serviceTypeCode, baseRate) => {
        if (!formData.languages || formData.languages.length === 0) {
            return baseRate;
        }
        
        // Check if user has Spanish language
        const hasSpanish = formData.languages.some(lang => {
            const language = parametricData?.languages?.find(l => l.id === lang.language_id);
            return language && language.name.toLowerCase().includes('spanish');
        });
        
        if (serviceTypeCode === 'phone') {
            return hasSpanish ? 0.55 : 0.65; // 55 cents for Spanish, 65 cents for others
        } else if (serviceTypeCode === 'document') {
            return hasSpanish ? 0.10 : 0.14; // 10 cents for Spanish, 14 cents for others
        }
        
        return baseRate;
    };

    // Check if user has required certifications for a service type
    const hasRequiredCertification = (serviceTypeCode) => {
        // Only these specific service types require certifications
        const requiresCertification = ['legal', 'medical', 'video'];
        
        if (!requiresCertification.includes(serviceTypeCode)) {
            return true; // Other service types don't require any certifications
        }
        
        if (!formData.is_certified) return false;
        
        const userCertificates = formData.certificates || [];
        
        // Get certificate type codes from parametric data
        const getCertificateTypeCode = (certificateTypeId) => {
            if (!certificateTypeId) return null;
            const certType = parametricData?.certificateTypes?.find(ct => 
                ct.id === parseInt(certificateTypeId) || ct.id === certificateTypeId
            );
            return certType?.code || null;
        };
        
        switch (serviceTypeCode) {
            case 'legal':
                // Legal requires one of the three court certifications
                return userCertificates.some(cert => {
                    const certCode = getCertificateTypeCode(cert.certificate_type_id);
                    return certCode && ['court_certified', 'federal_certified', 'ata_certified', 'administrative_court_certified'].includes(certCode);
                });
            
            case 'video':
                // Video Remote Interpretation requires the same legal certifications as legal service type
                return userCertificates.some(cert => {
                    const certCode = getCertificateTypeCode(cert.certificate_type_id);
                    return certCode && ['court_certified', 'federal_certified', 'ata_certified', 'administrative_court_certified'].includes(certCode);
                });
            
            case 'medical':
                // Medical-Legal requires any court certification OR medical certification
                return userCertificates.some(cert => {
                    const certCode = getCertificateTypeCode(cert.certificate_type_id);
                    return certCode && [
                        'court_certified', 
                        'federal_certified', 
                        'ata_certified', 
                        'administrative_court_certified',
                        'medical_certified'
                    ].includes(certCode);
                });
            
            default:
                return true; // Other service types don't require specific certifications
        }
    };

    const handleServiceTypeToggle = (serviceTypeId) => {
        const serviceType = parametricData?.serviceTypes?.find(st => 
            String(st.id) === String(serviceTypeId) || st.id === serviceTypeId
        );
        
        // Check if user can select this service type
        if (serviceType && !hasRequiredCertification(serviceType.code)) {
            toast.error(`This service type requires specific certifications. Please complete the Certificates step first.`);
            return;
        }
        
        setSelectedServiceTypes(prev => {
            const serviceTypeIdStr = String(serviceTypeId);
            const isSelected = prev.some(id => String(id) === serviceTypeIdStr || id === serviceTypeId);
            
            if (isSelected) {
                // Remove service type and its rate
                const newRates = { ...serviceRates };
                delete newRates[serviceTypeIdStr];
                setServiceRates(newRates);
                return prev.filter(id => String(id) !== serviceTypeIdStr && id !== serviceTypeId);
            } else {
                // Add service type with default platform rate and settings
                if (serviceType) {
                    setServiceRates(prev => ({
                        ...prev,
                        [serviceTypeIdStr]: {
                            service_type_id: serviceTypeIdStr,
                            rate_type: 'platform',
                            rate_amount: getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount),
                            rate_unit: serviceType.platform_rate_unit,
                            minimum_hours: serviceType.platform_minimum_hours,
                            interval_minutes: serviceType.platform_interval_minutes,
                            second_interval_rate_amount: serviceType.platform_second_interval_rate_amount,
                            second_interval_rate_unit: serviceType.platform_second_interval_rate_unit,
                            custom_minimum_hours: null,
                            custom_interval_minutes: null,
                            custom_second_interval_rate_amount: null,
                            custom_second_interval_rate_unit: null
                        }
                    }));
                }
                return [...prev, serviceTypeIdStr];
            }
        });

        // Clear errors when user makes selection
        if (errors.service_types) {
            setErrors(prev => ({ ...prev, service_types: null }));
        }
    };

    const handleRateTypeChange = (serviceTypeId, rateType) => {
        // Show modal reminder if switching to custom rate
        if (rateType === 'custom') {
            setShowPreferredProviderModal(true);
        }

        const serviceType = parametricData?.serviceTypes?.find(st => 
            String(st.id) === String(serviceTypeId) || st.id === serviceTypeId
        );
        setServiceRates(prev => ({
            ...prev,
            [serviceTypeId]: {
                ...prev[serviceTypeId],
                rate_type: rateType,
                rate_amount: rateType === 'platform' ? 
                    getLanguageSpecificRate(serviceType?.code, serviceType?.platform_rate_amount) : 
                    prev[serviceTypeId]?.rate_amount || '',
                rate_unit: rateType === 'platform' ? 
                    serviceType?.platform_rate_unit : 
                    prev[serviceTypeId]?.rate_unit || ((serviceType?.code === 'legal' || serviceType?.code === 'video') ? '3hours' : 'hours'),
                minimum_hours: rateType === 'platform' ? 
                    serviceType?.platform_minimum_hours : 
                    prev[serviceTypeId]?.minimum_hours || 1.0,
                interval_minutes: rateType === 'platform' ? 
                    serviceType?.platform_interval_minutes : 
                    prev[serviceTypeId]?.interval_minutes || 60,
                second_interval_rate_amount: rateType === 'platform' ? 
                    serviceType?.platform_second_interval_rate_amount : 
                    prev[serviceTypeId]?.second_interval_rate_amount || null,
                second_interval_rate_unit: rateType === 'platform' ? 
                    serviceType?.platform_second_interval_rate_unit : 
                    prev[serviceTypeId]?.second_interval_rate_unit || ((serviceType?.code === 'legal' || serviceType?.code === 'video') ? '3hours' : 'hours')
            }
        }));
    };

    const handleCustomRateChange = (serviceTypeId, field, value) => {
        const serviceTypeIdStr = String(serviceTypeId);
        const serviceType = parametricData?.serviceTypes?.find(st => 
            String(st.id) === String(serviceTypeId) || st.id === serviceTypeId
        );
        
        // Normalize rate_unit for legal/video: if 'hours' is set, convert to '3hours'
        let normalizedValue = value;
        if ((field === 'rate_unit' || field === 'custom_second_interval_rate_unit') && 
            (serviceType?.code === 'legal' || serviceType?.code === 'video') && 
            value === 'hours') {
            normalizedValue = '3hours';
        }
        
        setServiceRates(prev => ({
            ...prev,
            [serviceTypeIdStr]: {
                ...prev[serviceTypeIdStr],
                [field]: normalizedValue
            }
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        // Always require at least one service type, even for resubmissions
        if (selectedServiceTypes.length === 0) {
            newErrors.service_types = 'Please select at least one service type';
        }

        // Validate service rates
        for (const serviceTypeId of selectedServiceTypes) {
            const serviceTypeIdStr = String(serviceTypeId);
            const rate = serviceRates[serviceTypeIdStr];
            const serviceType = parametricData?.serviceTypes?.find(st => 
                String(st.id) === serviceTypeIdStr || st.id === serviceTypeId
            );
            
            if (!rate) {
                newErrors.service_rates = 'Please set rates for all selected service types';
                break;
            }
            
            if (rate.rate_type === 'custom') {
                if (!rate.rate_amount || rate.rate_amount <= 0) {
                    newErrors.service_rates = 'Custom rates must have a valid amount';
                    break;
                }
                if (rate.rate_amount > 1000) {
                    newErrors.service_rates = 'Custom rates cannot exceed $1000';
                    break;
                }
                if (!rate.rate_unit) {
                    newErrors.service_rates = 'Custom rates must specify time unit';
                    break;
                }
                if (serviceType?.platform_second_interval_rate_amount && (!rate.custom_second_interval_rate_amount || rate.custom_second_interval_rate_amount <= 0)) {
                    newErrors.service_rates = 'Second increment rate must have a valid amount';
                    break;
                }
                if (serviceType?.platform_second_interval_rate_amount && rate.custom_second_interval_rate_amount > 1000) {
                    newErrors.service_rates = 'Second increment rate cannot exceed $1000';
                    break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLanguageRateChange = (serviceTypeId, languageId, field, value) => {
        const stKey = String(serviceTypeId);
        const langKey = String(languageId);
        setLanguageRates(prev => {
            const updated = { ...prev };
            if (!updated[stKey]) {
                updated[stKey] = {};
            }
            if (!updated[stKey][langKey]) {
                updated[stKey][langKey] = { rate_amount: '', rate_unit: 'hours' };
            }
            updated[stKey][langKey][field] = value;
            return updated;
        });
    };

    const handleNext = () => {
        if (!validateForm()) {
            const errorMessage = Object.values(errors)[0];
            toast.error(errorMessage);
            return;
        }

        // Convert serviceRates object to array format
        const serviceRatesArray = Object.values(serviceRates);
        
        // Build language_rates array from languageRates state
        const languageRatesArray = [];
        Object.keys(languageRates).forEach(serviceTypeId => {
            Object.keys(languageRates[serviceTypeId]).forEach(languageId => {
                const lr = languageRates[serviceTypeId][languageId];
                if (lr.rate_amount != null && String(lr.rate_amount).trim() !== '' && !isNaN(parseFloat(lr.rate_amount))) {
                    languageRatesArray.push({
                        service_type_id: serviceTypeId,
                        language_id: languageId,
                        rate_amount: parseFloat(lr.rate_amount),
                        rate_unit: lr.rate_unit || 'hours'
                    });
                }
            });
        });
        
        onNext({
            service_types: selectedServiceTypes,
            service_rates: serviceRatesArray,
            language_rates: languageRatesArray
        });
    };

    const getSelectedServiceTypeNames = () => {
        if (!parametricData?.serviceTypes) return [];
        return parametricData.serviceTypes
            .filter(st => selectedServiceTypes.some(id => 
                String(id) === String(st.id) || id === st.id
            ))
            .map(st => st.name);
    };

    return (
        <div className="space-y-6">
            {/* Preferred Provider Information Modal */}
            {showPreferredProviderModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div 
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                            aria-hidden="true"
                            onClick={() => setShowPreferredProviderModal(false)}
                        ></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
                                    <CheckIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        💜 Become a Preferred Provider!
                                    </h3>
                                    <div className="mt-4 text-left space-y-3">
                                        <p className="text-sm text-gray-600">
                                            By choosing our <strong className="text-purple-600">platform rates</strong> or setting competitive rates, you can become a <strong className="text-purple-600">Preferred Provider</strong> and enjoy exclusive benefits:
                                        </p>
                                        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r">
                                            <ul className="space-y-2 text-sm text-gray-700">
                                                <li className="flex items-start">
                                                    <CheckIcon className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <span><strong>Self-assign to jobs</strong> - No waiting for admin approval!</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckIcon className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <span><strong>Faster job acceptance</strong> - Be first in line for opportunities</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckIcon className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <span><strong>More job offers</strong> - Stand out to employers</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-xs text-amber-800">
                                                <strong>Important:</strong> If you increase your rates later, you'll need admin review to regain preferred provider status. Keep your rates competitive!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6">
                                <button
                                    type="button"
                                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
                                    onClick={() => setShowPreferredProviderModal(false)}
                                >
                                    Got it! Let's choose my rates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Service Types & Rates
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Choose the types of interpretation services you provide and set your rates. 
                            <span className="text-purple-600 font-medium"> Use platform rates to become a Preferred Provider and self-assign to jobs!</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPreferredProviderModal(true)}
                        className="flex-shrink-0 text-purple-600 hover:text-purple-700 text-sm font-medium underline"
                    >
                        Learn More
                    </button>
                </div>
            </div>

            {(errors.service_types || isFieldRejected('service_types')) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800 text-sm">{errors.service_types || 'This field needs to be updated'}</p>
                </div>
            )}

            {/* Service Types Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isFieldRejected('service_types') ? 'ring-2 ring-red-500 rounded-lg p-2 bg-red-50' : ''}`}>
                {parametricData?.serviceTypes && parametricData.serviceTypes.length > 0 ? (
                    parametricData.serviceTypes
                        .filter(serviceType => serviceType.code !== 'other' && serviceType.name.toLowerCase() !== 'other')
                        .map((serviceType) => {
                    // Check if selected, handling both string and number IDs
                    const isSelected = selectedServiceTypes.some(id => 
                        String(id) === String(serviceType.id) || id === serviceType.id
                    );
                    
                    return (
                        <div
                            key={serviceType.id}
                            className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : hasRequiredCertification(serviceType.code)
                                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                                        : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            }`}
                            onClick={() => hasRequiredCertification(serviceType.code) && handleServiceTypeToggle(serviceType.id)}
                        >
                            <div className="flex items-start">
                                <div className="flex-1">
                                    <h4 className={`font-medium ${
                                        isSelected ? 'text-blue-900' : 'text-gray-900'
                                    }`}>
                                        {serviceType.name}
                                    </h4>
                                    {serviceType.description && (
                                        <p className={`text-sm mt-1 ${
                                            isSelected ? 'text-blue-700' : 'text-gray-600'
                                        }`}>
                                            {serviceType.description}
                                        </p>
                                    )}
                                </div>
                                
                                {/* Checkbox */}
                                <div className={`flex-shrink-0 ml-3 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-300'
                                }`}>
                                    {isSelected && (
                                        <CheckIcon className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>
                            
                            {/* Show certification requirement warning */}
                            {!hasRequiredCertification(serviceType.code) && (
                                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-xs text-yellow-800">
                                        <strong>Requires certification:</strong> 
                                        {serviceType.code === 'legal' && ' Federal Court, State Court, or Administrative Court certification'}
                                        {serviceType.code === 'video' && ' Federal Court, State Court, or Administrative Court certification'}
                                        {serviceType.code === 'medical' && ' Any court certification OR Medical certification'}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })
                ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                        {parametricData?.serviceTypes ? 'No service types available' : 'Loading service types...'}
                    </div>
                )}
            </div>

            {/* Service Rates Section */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Set Your Rates</h4>
                <p className="text-sm text-gray-600 mb-4">
                    For each selected service type, choose whether to accept our platform rates or set your own custom rates.
                </p>
                
                {selectedServiceTypes.length > 0 && (
                    <div className="space-y-4">
                        {selectedServiceTypes.map(serviceTypeId => {
                            // Handle both string and number IDs
                            const serviceType = parametricData?.serviceTypes?.find(st => 
                                String(st.id) === String(serviceTypeId) || st.id === serviceTypeId
                            );
                            const rateKey = String(serviceTypeId);
                            const rate = serviceRates[rateKey];
                            
                            if (!serviceType) return null;
                            
                            // If no rate exists, show a message (shouldn't happen due to useEffect, but safety check)
                            if (!rate) {
                                return (
                                    <div key={serviceTypeId} className="border border-gray-200 rounded-lg p-4">
                                        <h5 className="font-medium text-gray-900">{serviceType.name}</h5>
                                        <p className="text-sm text-gray-500 mt-2">Loading rate information...</p>
                                    </div>
                                );
                            }
                            
                            // Check if this specific rate is rejected
                            const rateRejectedFieldName = `service_rate_${serviceTypeId}`;
                            const isRateRejected = isFieldRejected(rateRejectedFieldName);
                            
                            return (
                                <div key={serviceTypeId} className={`border-2 rounded-lg p-4 ${isRateRejected ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-gray-200'}`}>
                                    {isRateRejected && (
                                        <div className="mb-3 bg-red-100 border border-red-300 rounded-lg p-3">
                                            <p className="text-sm font-medium text-red-900">
                                                ⚠️ This rate has been rejected and needs to be updated
                                            </p>
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <h5 className="font-medium text-gray-900 mb-3">{serviceType.name}</h5>
                                        
                                        {/* Platform Rate Display */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-blue-900">Platform Rate</span>
                                                <span className="text-lg font-bold text-blue-900">
                                                    ${rate.rate_type === 'platform' ? 
                                                        `${rate.rate_amount}/${rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : rate.rate_unit === '3hours' ? '3hr' : rate.rate_unit === '6hours' ? '6hr' : 'hr'}` : 
                                                        `${getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount)}/${serviceType.platform_rate_unit === 'minutes' ? 'min' : serviceType.platform_rate_unit === 'word' ? 'word' : 'hr'}`}
                                                </span>
                                            </div>
                                            {(serviceType.code === 'phone' || serviceType.code === 'document') && (
                                                <div className="text-xs text-blue-600 mb-2">
                                                    {(() => {
                                                        const hasSpanish = formData.languages?.some(lang => {
                                                            const language = parametricData?.languages?.find(l => l.id === lang.language_id);
                                                            return language && language.name.toLowerCase().includes('spanish');
                                                        });
                                                        if (serviceType.code === 'phone') {
                                                            return hasSpanish ? 'Spanish rate (55¢/min)' : 'Other languages rate (65¢/min)';
                                                        } else if (serviceType.code === 'document') {
                                                            return hasSpanish ? 'Spanish rate (10¢/word)' : 'Other languages rate (14¢/word)';
                                                        }
                                                        return '';
                                                    })()}
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                                                {serviceType.platform_rate_unit !== 'word' && (
                                                    <>
                                                        <div className="flex items-center">
                                                            <span className="font-medium mr-1">Min:</span>
                                                            <span>{rate.rate_type === 'platform' ? 
                                                                `${rate.minimum_hours}h` : 
                                                                `${serviceType.platform_minimum_hours}h`}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="font-medium mr-1">Increments:</span>
                                                            <span>{rate.rate_type === 'platform' ? 
                                                                `${rate.interval_minutes}min` : 
                                                                `${serviceType.platform_interval_minutes}min`}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {serviceType.platform_rate_unit === 'word' && (
                                                    <div className="col-span-2 text-center">
                                                        <span className="font-medium">Per word pricing</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {serviceType.platform_second_interval_rate_amount && (
                                                <div className="mt-2 pt-2 border-t border-blue-200">
                                                    <div className="text-xs text-blue-700">
                                                        <span className="font-medium">Billing Structure:</span>
                                                        <div className="mt-1">
                                                            • {rate.rate_type === 'platform' ? 
                                                                `${rate.minimum_hours}h` : 
                                                                `${serviceType.platform_minimum_hours}h`} minimum
                                                        </div>
                                                        <div>
                                                            • Then {rate.rate_type === 'platform' ? 
                                                                `${Math.floor(rate.interval_minutes / 60)}h` : 
                                                                `${Math.floor(serviceType.platform_interval_minutes / 60)}h`} blocks
                                                        </div>
                                                        <div>
                                                            • Then 1h increments
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-6">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`rate_type_${serviceTypeId}`}
                                                    value="platform"
                                                    checked={rate.rate_type === 'platform'}
                                                    onChange={(e) => handleRateTypeChange(serviceTypeId, e.target.value)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm font-medium text-gray-700">Accept Platform Rate</span>
                                            </label>
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`rate_type_${serviceTypeId}`}
                                                    value="custom"
                                                    checked={rate.rate_type === 'custom'}
                                                    onChange={(e) => handleRateTypeChange(serviceTypeId, e.target.value)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm font-medium text-gray-700">Set Custom Rate</span>
                                            </label>
                                        </div>
                                        
                                        {rate.rate_type === 'custom' && (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="25.00"
                                                        value={rate.rate_amount || ''}
                                                        onChange={(e) => handleCustomRateChange(serviceTypeId, 'rate_amount', parseFloat(e.target.value))}
                                                        className="flex-1"
                                                        label="Rate Amount"
                                                    />
                                                    {(serviceType.code === 'legal' || serviceType.code === 'video') ? (
                                                        <div className="w-32">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Rate Unit</label>
                                                            <select
                                                                value={(rate.rate_unit === 'hours' || !rate.rate_unit) ? '3hours' : rate.rate_unit}
                                                                onChange={(e) => handleCustomRateChange(serviceTypeId, 'rate_unit', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="3hours">Per 3 Hours</option>
                                                                <option value="6hours">Per 6 Hours</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            options={RATE_UNITS}
                                                            value={rate.rate_unit || 'hours'}
                                                            onChange={(e) => handleCustomRateChange(serviceTypeId, 'rate_unit', e.target.value)}
                                                            className="w-32"
                                                            label="Rate Unit"
                                                        />
                                                    )}
                                                </div>
                                                
                                                {(rate.rate_unit !== 'word' && serviceType.code !== 'legal' && serviceType.code !== 'video') && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input
                                                            type="number"
                                                            placeholder="2.0"
                                                            value={rate.custom_minimum_hours || rate.minimum_hours || ''}
                                                            onChange={(e) => handleCustomRateChange(serviceTypeId, 'custom_minimum_hours', parseFloat(e.target.value))}
                                                            label="Minimum Hours"
                                                            helper="Minimum billing time"
                                                        />
                                                        <Input
                                                            type="number"
                                                            placeholder="60"
                                                            value={rate.custom_interval_minutes || rate.interval_minutes || ''}
                                                            onChange={(e) => handleCustomRateChange(serviceTypeId, 'custom_interval_minutes', parseInt(e.target.value))}
                                                            label="Increments (minutes)"
                                                            helper="Billing increments after minimum"
                                                        />
                                                    </div>
                                                )}
                                                
                                                {/* Rate Comparison */}
                                                {rate.rate_amount && rate.rate_unit && (
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Rate Comparison</h6>
                                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                                            <div>
                                                                <span className="font-medium text-gray-600">Your Rate:</span>
                                                                <div className="text-green-700 font-medium">
                                                                    {(() => {
                                                                        // Normalize rate_unit for legal/video: if 'hours', treat as '3hours'
                                                                        const normalizedUnit = (serviceType.code === 'legal' || serviceType.code === 'video') && rate.rate_unit === 'hours' 
                                                                            ? '3hours' 
                                                                            : rate.rate_unit;
                                                                        const unitDisplay = normalizedUnit === 'minutes' ? 'min' : 
                                                                                          normalizedUnit === 'word' ? 'word' : 
                                                                                          normalizedUnit === '3hours' ? '3hr' : 
                                                                                          normalizedUnit === '6hours' ? '6hr' : 
                                                                                          'hr';
                                                                        return `$${rate.rate_amount}/${unitDisplay}`;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-600">Platform Rate:</span>
                                                                <div className="text-blue-700 font-medium">
                                                                    ${getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount)}/{(serviceType.code === 'legal' || serviceType.code === 'video') ? '3hr' : serviceType.platform_rate_unit === 'minutes' ? 'min' : serviceType.platform_rate_unit === 'word' ? 'word' : 'hr'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div className="text-xs text-gray-600">
                                                                {(() => {
                                                                    const platformRate = getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount);
                                                                    if (rate.rate_amount > platformRate) {
                                                                        return <span className="text-orange-600">Your rate is ${(rate.rate_amount - platformRate).toFixed(2)} higher than platform rate</span>;
                                                                    } else if (rate.rate_amount < platformRate) {
                                                                        return <span className="text-green-600">Your rate is ${(platformRate - rate.rate_amount).toFixed(2)} lower than platform rate</span>;
                                                                    } else {
                                                                        return <span className="text-blue-600">Your rate matches the platform rate</span>;
                                                                    }
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Second Increment Rate Fields */}
                                                {serviceType.platform_second_interval_rate_amount && (
                                                    <div className="border-t pt-3">
                                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Second Increment Rate (After Minimum)</h6>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="55.00"
                                                                value={rate.custom_second_interval_rate_amount || rate.second_interval_rate_amount || ''}
                                                                onChange={(e) => handleCustomRateChange(serviceTypeId, 'custom_second_interval_rate_amount', parseFloat(e.target.value))}
                                                                className="flex-1"
                                                                label="Second Rate Amount"
                                                            />
                                                            <Select
                                                                options={RATE_UNITS}
                                                                value={rate.custom_second_interval_rate_unit || rate.second_interval_rate_unit || 'hours'}
                                                                onChange={(e) => handleCustomRateChange(serviceTypeId, 'custom_second_interval_rate_unit', e.target.value)}
                                                                className="w-32"
                                                                label="Second Rate Unit"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Language-specific rates section */}
                                        {formData.languages && formData.languages.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h6 className="text-sm font-medium text-gray-700 mb-2">
                                                    Language-specific rates (optional)
                                                </h6>
                                                <p className="text-xs text-gray-500 mb-3">
                                                    Set different rates for different languages within this service type. 
                                                    Example: Spanish Medical Standard = $55/hr, Portuguese Medical Standard = $65/hr
                                                </p>
                                                <div className="space-y-2">
                                                    {formData.languages.map((lang) => {
                                                        const langId = String(lang.language_id);
                                                        const langName = parametricData?.languages?.find(l => String(l.id) === langId)?.name || 'Unknown';
                                                        const stKey = String(serviceTypeId);
                                                        const langRate = languageRates[stKey]?.[langId] || { rate_amount: '', rate_unit: 'hours' };
                                                        return (
                                                            <div key={langId} className="bg-white border border-gray-200 rounded-md p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-medium text-gray-700">{langName}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="e.g. 55"
                                                                        value={langRate.rate_amount || ''}
                                                                        onChange={(e) => handleLanguageRateChange(serviceTypeId, langId, 'rate_amount', e.target.value)}
                                                                        className="flex-1"
                                                                        label="Rate ($)"
                                                                    />
                                                                    <Select
                                                                        options={RATE_UNITS}
                                                                        value={langRate.rate_unit || 'hours'}
                                                                        onChange={(e) => handleLanguageRateChange(serviceTypeId, langId, 'rate_unit', e.target.value)}
                                                                        className="w-32"
                                                                        label="Per"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {errors.service_rates && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{errors.service_rates}</p>
                    </div>
                )}
            </div>

            {/* Selection Summary */}
            {selectedServiceTypes.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                        Selected Service Types ({selectedServiceTypes.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {getSelectedServiceTypeNames().map((name, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Important Notes:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• You can modify your service types after creating your profile</li>
                    <li>• Some service types may require specific certifications</li>
                    <li>• Medical and legal interpretation often require specialized training</li>
                    <li>• Video and telephone interpretation require reliable internet/phone service</li>
                </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                {!isFirstStep && !isEditing && (
                    <Button
                        onClick={onPrevious}
                        variant="outline"
                    >
                        Previous
                    </Button>
                )}
                
                <div className={isFirstStep && !isEditing ? 'ml-auto' : ''}>
                    <Button
                        onClick={handleNext}
                        disabled={selectedServiceTypes.length === 0}
                    >
                        {isEditing ? 'Save & Return to Review' : 'Next'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ServiceTypesStep;