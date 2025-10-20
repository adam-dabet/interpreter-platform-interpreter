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
    const [errors, setErrors] = useState({});
    
    // Helper to check if field is rejected
    const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

    // Sync selectedServiceTypes with formData.service_types when it changes (e.g., from prefillFormData)
    useEffect(() => {
        if (formData.service_types && Array.isArray(formData.service_types) && formData.service_types.length > 0) {
            setSelectedServiceTypes(formData.service_types);
        }
    }, [formData.service_types]);

    // Initialize service rates from formData
    useEffect(() => {
        if (formData.service_rates && parametricData?.serviceTypes) {
            // Convert array format to object format if needed
            let ratesObject = {};
            
            if (Array.isArray(formData.service_rates)) {
                // Convert array to object
                formData.service_rates.forEach(rate => {
                    if (rate.service_type_id) {
                        ratesObject[rate.service_type_id] = rate;
                    }
                });
            } else if (typeof formData.service_rates === 'object') {
                ratesObject = formData.service_rates;
            }
            
            setServiceRates(ratesObject);
        }
    }, [formData.service_rates, parametricData?.serviceTypes]);

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
        const requiresCertification = ['legal', 'medical'];
        
        if (!requiresCertification.includes(serviceTypeCode)) {
            return true; // Other service types don't require any certifications
        }
        
        if (!formData.is_certified) return false;
        
        const userCertificates = formData.certificates || [];
        
        switch (serviceTypeCode) {
            case 'legal':
                // Legal requires one of the three court certifications
                return userCertificates.some(cert => 
                    cert.certificate_type_id && 
                    [1, 3, 6].includes(cert.certificate_type_id) // State Court, Administrative Court, Federal Court
                );
            
            case 'medical':
                // Medical-Legal requires any court certification OR medical certification
                return userCertificates.some(cert => 
                    cert.certificate_type_id && 
                    ([1, 3, 6, 23].includes(cert.certificate_type_id)) // State Court, Administrative Court, Federal Court, OR Medical
                );
            
            default:
                return true; // Other service types don't require specific certifications
        }
    };

    const handleServiceTypeToggle = (serviceTypeId) => {
        const serviceType = parametricData?.serviceTypes?.find(st => st.id === serviceTypeId);
        
        // Check if user can select this service type
        if (serviceType && !hasRequiredCertification(serviceType.code)) {
            toast.error(`This service type requires specific certifications. Please complete the Certificates step first.`);
            return;
        }
        
        setSelectedServiceTypes(prev => {
            if (prev.includes(serviceTypeId)) {
                // Remove service type and its rate
                const newRates = { ...serviceRates };
                delete newRates[serviceTypeId];
                setServiceRates(newRates);
                return prev.filter(id => id !== serviceTypeId);
            } else {
                // Add service type with default platform rate and settings
                if (serviceType) {
                    setServiceRates(prev => ({
                        ...prev,
                        [serviceTypeId]: {
                            service_type_id: serviceTypeId,
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
                return [...prev, serviceTypeId];
            }
        });

        // Clear errors when user makes selection
        if (errors.service_types) {
            setErrors(prev => ({ ...prev, service_types: null }));
        }
    };

    const handleRateTypeChange = (serviceTypeId, rateType) => {
        const serviceType = parametricData?.serviceTypes?.find(st => st.id === serviceTypeId);
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
                    prev[serviceTypeId]?.rate_unit || 'hours',
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
                    prev[serviceTypeId]?.second_interval_rate_unit || 'hours'
            }
        }));
    };

    const handleCustomRateChange = (serviceTypeId, field, value) => {
        setServiceRates(prev => ({
            ...prev,
            [serviceTypeId]: {
                ...prev[serviceTypeId],
                [field]: value
            }
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (selectedServiceTypes.length === 0) {
            newErrors.service_types = 'Please select at least one service type';
        }

        // Validate service rates
        for (const serviceTypeId of selectedServiceTypes) {
            const rate = serviceRates[serviceTypeId];
            const serviceType = parametricData?.serviceTypes?.find(st => st.id === serviceTypeId);
            
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

    const handleNext = () => {
        if (!validateForm()) {
            const errorMessage = Object.values(errors)[0];
            toast.error(errorMessage);
            return;
        }

        // Convert serviceRates object to array format
        const serviceRatesArray = Object.values(serviceRates);
        
        onNext({
            service_types: selectedServiceTypes,
            service_rates: serviceRatesArray
        });
    };

    const getSelectedServiceTypeNames = () => {
        if (!parametricData?.serviceTypes) return [];
        return parametricData.serviceTypes
            .filter(st => selectedServiceTypes.includes(st.id))
            .map(st => st.name);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Service Types & Rates
                </h3>
                <p className="text-gray-600 mb-6">
                    Choose the types of interpretation services you provide and set your rates. 
                    <span className="text-blue-600 font-medium"> You're more likely to receive jobs if you agree to our set rates!</span>
                </p>
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
                    const isSelected = selectedServiceTypes.includes(serviceType.id);
                    
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
                            const serviceType = parametricData?.serviceTypes?.find(st => st.id === serviceTypeId);
                            const rate = serviceRates[serviceTypeId];
                            
                            if (!serviceType || !rate) return null;
                            
                            return (
                                <div key={serviceTypeId} className="border border-gray-200 rounded-lg p-4">
                                    <div className="mb-4">
                                        <h5 className="font-medium text-gray-900 mb-3">{serviceType.name}</h5>
                                        
                                        {/* Platform Rate Display */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-blue-900">Platform Rate</span>
                                                <span className="text-lg font-bold text-blue-900">
                                                    ${rate.rate_type === 'platform' ? 
                                                        `${rate.rate_amount}/${rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : 'hr'}` : 
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
                                                    <Select
                                                        options={RATE_UNITS}
                                                        value={rate.rate_unit || 'hours'}
                                                        onChange={(e) => handleCustomRateChange(serviceTypeId, 'rate_unit', e.target.value)}
                                                        className="w-32"
                                                        label="Rate Unit"
                                                    />
                                                </div>
                                                
                                                {rate.rate_unit !== 'word' && (
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
                                                                    ${rate.rate_amount}/{rate.rate_unit === 'minutes' ? 'min' : rate.rate_unit === 'word' ? 'word' : 'hr'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-600">Platform Rate:</span>
                                                                <div className="text-blue-700 font-medium">
                                                                    ${getLanguageSpecificRate(serviceType.code, serviceType.platform_rate_amount)}/{serviceType.platform_rate_unit === 'minutes' ? 'min' : serviceType.platform_rate_unit === 'word' ? 'word' : 'hr'}
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