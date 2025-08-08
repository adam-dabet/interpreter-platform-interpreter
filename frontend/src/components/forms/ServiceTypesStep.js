import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

const ServiceTypesStep = ({ formData, onNext, onPrevious, isFirstStep, parametricData }) => {
    const [selectedServiceTypes, setSelectedServiceTypes] = useState(formData.service_types || []);
    const [hourlyRate, setHourlyRate] = useState(formData.hourly_rate || '');
    const [errors, setErrors] = useState({});

    const handleServiceTypeToggle = (serviceTypeId) => {
        setSelectedServiceTypes(prev => {
            if (prev.includes(serviceTypeId)) {
                return prev.filter(id => id !== serviceTypeId);
            } else {
                return [...prev, serviceTypeId];
            }
        });

        // Clear errors when user makes selection
        if (errors.service_types) {
            setErrors(prev => ({ ...prev, service_types: null }));
        }
    };

    const handleHourlyRateChange = (e) => {
        const value = e.target.value;
        setHourlyRate(value);
        
        // Clear errors when user makes changes
        if (errors.hourly_rate) {
            setErrors(prev => ({ ...prev, hourly_rate: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (selectedServiceTypes.length === 0) {
            newErrors.service_types = 'Please select at least one service type';
        }

        // Validate hourly rate if provided
        if (hourlyRate && hourlyRate !== '') {
            const rate = parseFloat(hourlyRate);
            if (isNaN(rate) || rate < 0) {
                newErrors.hourly_rate = 'Hourly rate must be a valid positive number';
            } else if (rate > 1000) {
                newErrors.hourly_rate = 'Hourly rate cannot exceed $1000';
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

        onNext({
            service_types: selectedServiceTypes,
            hourly_rate: hourlyRate
        });
    };

    const getSelectedServiceTypeNames = () => {
        return parametricData.serviceTypes
            .filter(st => selectedServiceTypes.includes(st.id))
            .map(st => st.name);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select Your Service Types
                </h3>
                <p className="text-gray-600 mb-6">
                    Choose the types of interpretation services you provide. You can select multiple options.
                </p>
            </div>

            {errors.service_types && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800 text-sm">{errors.service_types}</p>
                </div>
            )}

            {/* Service Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parametricData.serviceTypes.map((serviceType) => {
                    const isSelected = selectedServiceTypes.includes(serviceType.id);
                    
                    return (
                        <div
                            key={serviceType.id}
                            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleServiceTypeToggle(serviceType.id)}
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
                        </div>
                    );
                })}
            </div>

            {/* Hourly Rate Section */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Professional Information</h4>
                <div className="max-w-md">
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        label="Hourly Rate ($)"
                        placeholder="25.00"
                        value={hourlyRate}
                        onChange={handleHourlyRateChange}
                        error={errors.hourly_rate}
                        helper="Your preferred hourly rate for interpretation services (optional)"
                    />
                </div>
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
                {!isFirstStep && (
                    <Button
                        onClick={onPrevious}
                        variant="outline"
                    >
                        Previous
                    </Button>
                )}
                
                <div className={isFirstStep ? 'ml-auto' : ''}>
                    <Button
                        onClick={handleNext}
                        disabled={selectedServiceTypes.length === 0}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ServiceTypesStep;