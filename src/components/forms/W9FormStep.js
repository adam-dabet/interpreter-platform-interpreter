import React, { useState, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import toast from 'react-hot-toast';

const W9FormStep = ({ formData, onNext, onPrevious, isFirstStep, isEditing, rejectedFields = [] }) => {
    
    // Helper to check if a W9 field is rejected
    // Supports both granular field names (old) and grouped section names (new)
    const isFieldRejected = (fieldName) => {
        // Check for exact match first
        if (rejectedFields.includes(fieldName)) return true;
        
        // Check for grouped sections (new approach)
        // Map individual fields to their parent sections
        const fieldToSectionMap = {
            'w9_business_name': 'w9_business_info',
            'w9_business_name_alt': 'w9_business_info',
            'w9_tax_classification': 'w9_tax_info',
            'w9_llc_classification': 'w9_tax_info',
            'w9_ssn': 'w9_tax_id',
            'w9_ein': 'w9_tax_id',
            'w9_address': 'w9_address',
            'w9_city': 'w9_address',
            'w9_state': 'w9_address',
            'w9_zip_code': 'w9_address'
        };
        
        const section = fieldToSectionMap[fieldName];
        return section && rejectedFields.includes(section);
    };
    
    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize W9 data with address from formData if available
    const getInitialW9Data = () => {
        const existingW9Data = formData.w9_data || {};
        
        // Create full name from first and last name
        const fullName = [formData.first_name, formData.middle_name, formData.last_name]
            .filter(Boolean)
            .join(' ');
        
        return {
            business_name: existingW9Data.business_name || fullName || '',
            business_name_alt: existingW9Data.business_name_alt || '',
            tax_classification: existingW9Data.tax_classification || 'individual',
            llc_classification: existingW9Data.llc_classification || '',
            has_foreign_partners: existingW9Data.has_foreign_partners || false,
            exempt_payee_code: existingW9Data.exempt_payee_code || '',
            fatca_exemption_code: existingW9Data.fatca_exemption_code || '',
            ssn: existingW9Data.ssn || '',
            ein: existingW9Data.ein || '',
            address: existingW9Data.address || formData.street_address || '',
            city: existingW9Data.city || formData.city || '',
            state: existingW9Data.state || formData.state_id || '',
            zip_code: existingW9Data.zip_code || formData.zip_code || '',
            account_number: existingW9Data.account_number || '',
            signature: existingW9Data.signature || '',
            signature_date: existingW9Data.signature_date || '',
            electronic_signature_acknowledgment: existingW9Data.electronic_signature_acknowledgment || false
        };
    };
    
    const [w9Data, setW9Data] = useState(getInitialW9Data());
    const [errors, setErrors] = useState({});

    // Individual field validation functions
    const validateField = (field, value) => {
        let error = null;
        
        switch (field) {
            case 'business_name':
                if (!value?.trim()) {
                    error = 'Name of entity/individual is required';
                }
                break;
                
            case 'tax_classification':
                if (!value) {
                    error = 'Federal tax classification is required';
                }
                break;
                
            case 'llc_classification':
                if (w9Data.tax_classification === 'llc' && (!value || (typeof value === 'string' && !value.trim()))) {
                    error = 'LLC classification is required';
                }
                break;
                
            case 'ssn':
                // Only validate format if value is provided
                if (value?.trim() && !/^\d{3}-\d{2}-\d{4}$/.test(value)) {
                    error = 'SSN must be in format XXX-XX-XXXX';
                }
                break;
                
            case 'ein':
                // Only validate format if value is provided
                if (value?.trim() && !/^\d{2}-\d{7}$/.test(value)) {
                    error = 'EIN must be in format XX-XXXXXXX';
                }
                break;
                
            case 'address':
                if (!value?.trim()) {
                    error = 'Address is required';
                }
                break;
                
            case 'city':
                if (!value?.trim()) {
                    error = 'City is required';
                }
                break;
                
            case 'state':
                if (!value || (typeof value === 'string' && !value.trim())) {
                    error = 'State is required';
                }
                break;
                
            case 'zip_code':
                if (!value?.trim()) {
                    error = 'ZIP code is required';
                } else if (!/^\d{5}(-\d{4})?$/.test(value)) {
                    error = 'ZIP code must be in format 12345 or 12345-6789';
                }
                break;
                
            case 'signature':
                if (!value?.trim()) {
                    error = 'Electronic signature is required';
                }
                break;
                
            case 'signature_date':
                if (!value || (typeof value === 'string' && !value.trim())) {
                    error = 'Signature date is required';
                } else {
                    const today = getTodayDate();
                    if (value !== today) {
                        error = 'Signature date must be today\'s date';
                    }
                }
                break;
                
            case 'electronic_signature_acknowledgment':
                if (!value) {
                    error = 'Electronic signature acknowledgment is required';
                }
                break;
        }
        
        return error;
    };

    const handleW9DataChange = (field, value) => {
        let formattedValue = value;
        
        // Format SSN
        if (field === 'ssn') {
            // Remove all non-digits
            const digits = value.replace(/\D/g, '');
            // Format as XXX-XX-XXXX
            if (digits.length <= 3) {
                formattedValue = digits;
            } else if (digits.length <= 5) {
                formattedValue = `${digits.slice(0, 3)}-${digits.slice(3)}`;
            } else {
                formattedValue = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
            }
        }
        
        // Format EIN
        if (field === 'ein') {
            // Remove all non-digits
            const digits = value.replace(/\D/g, '');
            // Format as XX-XXXXXXX
            if (digits.length <= 2) {
                formattedValue = digits;
            } else {
                formattedValue = `${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
            }
        }
        
        // Format ZIP code
        if (field === 'zip_code') {
            // Remove all non-digits
            const digits = value.replace(/\D/g, '');
            // Format as 12345 or 12345-6789
            if (digits.length <= 5) {
                formattedValue = digits;
            } else {
                formattedValue = `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
            }
        }
        
        setW9Data(prev => ({ ...prev, [field]: formattedValue }));
        
        // Validate field immediately for format-sensitive fields (SSN, EIN, ZIP)
        const formatSensitiveFields = ['ssn', 'ein', 'zip_code'];
        if (formatSensitiveFields.includes(field)) {
            // Validate after a short delay to allow formatting to complete
            setTimeout(() => {
                const error = validateField(field, formattedValue);
                setErrors(prev => ({
                    ...prev,
                    [field]: error
                }));
            }, 100);
        } else {
            // Clear error for other fields (will validate on blur)
            if (errors[field]) {
                setErrors(prev => ({ ...prev, [field]: null }));
            }
        }
    };

    // Handle field blur - validate when user leaves the field
    const handleFieldBlur = (field) => {
        const value = w9Data[field];
        const error = validateField(field, value);
        setErrors(prev => ({
            ...prev,
            [field]: error
        }));
    };

    // Re-validate dependent fields when tax_classification changes
    useEffect(() => {
        // Clear and re-validate SSN/EIN when tax classification changes
        if (w9Data.tax_classification) {
            const ssnError = validateField('ssn', w9Data.ssn);
            const einError = validateField('ein', w9Data.ein);
            const llcError = validateField('llc_classification', w9Data.llc_classification);
            
            setErrors(prev => ({
                ...prev,
                ssn: ssnError,
                ein: einError,
                llc_classification: llcError
            }));
        }
    }, [w9Data.tax_classification, w9Data.ssn, w9Data.ein, w9Data.llc_classification]);

    const validateForm = () => {
        const newErrors = {};

        // Line 1: Name validation
        if (!w9Data.business_name?.trim()) {
            newErrors.business_name = 'Name of entity/individual is required';
        }
        
        // Line 3a: Tax classification validation
        if (!w9Data.tax_classification) {
            newErrors.tax_classification = 'Federal tax classification is required';
        }
        
        // LLC classification validation
        if (w9Data.tax_classification === 'llc' && (!w9Data.llc_classification || (typeof w9Data.llc_classification === 'string' && !w9Data.llc_classification.trim()))) {
            newErrors.llc_classification = 'LLC classification is required';
        }
        
        // TIN validation - require at least one of SSN or EIN
        const hasSSN = w9Data.ssn?.trim() && /^\d{3}-\d{2}-\d{4}$/.test(w9Data.ssn);
        const hasEIN = w9Data.ein?.trim() && /^\d{2}-\d{7}$/.test(w9Data.ein);
        
        if (!hasSSN && !hasEIN) {
            newErrors.ssn = 'Either Social Security Number or Employer Identification Number is required';
            newErrors.ein = 'Either Social Security Number or Employer Identification Number is required';
        } else {
            // Validate format if provided
            if (w9Data.ssn?.trim() && !/^\d{3}-\d{2}-\d{4}$/.test(w9Data.ssn)) {
                newErrors.ssn = 'SSN must be in format XXX-XX-XXXX';
            }
            if (w9Data.ein?.trim() && !/^\d{2}-\d{7}$/.test(w9Data.ein)) {
                newErrors.ein = 'EIN must be in format XX-XXXXXXX';
            }
        }
        
        // Line 5: Address validation
        if (!w9Data.address?.trim()) {
            newErrors.address = 'Address is required';
        }
        
        // Line 6: City, state, ZIP validation
        if (!w9Data.city?.trim()) {
            newErrors.city = 'City is required';
        }
        
        if (!w9Data.state || (typeof w9Data.state === 'string' && !w9Data.state.trim())) {
            newErrors.state = 'State is required';
        }
        
        if (!w9Data.zip_code?.trim()) {
            newErrors.zip_code = 'ZIP code is required';
        } else if (!/^\d{5}(-\d{4})?$/.test(w9Data.zip_code)) {
            newErrors.zip_code = 'ZIP code must be in format 12345 or 12345-6789';
        }
        
        // Signature validation
        if (!w9Data.signature?.trim()) {
            newErrors.signature = 'Electronic signature is required';
        }
        
        if (!w9Data.signature_date || (typeof w9Data.signature_date === 'string' && !w9Data.signature_date.trim())) {
            newErrors.signature_date = 'Signature date is required';
        } else {
            // Validate that signature date is today's date
            const today = getTodayDate();
            if (w9Data.signature_date !== today) {
                newErrors.signature_date = 'Signature date must be today\'s date';
            }
        }
        
        if (!w9Data.electronic_signature_acknowledgment) {
            newErrors.electronic_signature_acknowledgment = 'Electronic signature acknowledgment is required';
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
            w9_entry_method: 'manual',
            w9_data: w9Data
        });
    };


    const usStates = [
        { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
        { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
        { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
        { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
        { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
        { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
        { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
        { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
        { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
        { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
        { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
        { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
        { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
        { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
        { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
        { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
        { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'District of Columbia' }
    ];

    // Check if any W9 fields are rejected
    const hasRejectedW9Fields = rejectedFields.some(field => field.startsWith('w9_'));
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Form W-9 - Request for Taxpayer Identification Number and Certification
                </h3>
                <p className="text-gray-600 mb-6">
                    Please provide your W-9 tax form information. This information is required for tax reporting purposes and will be used to generate your 1099 form.
                </p>
                
                {/* Show notice if W9 fields are rejected */}
                {hasRejectedW9Fields && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    <strong>W-9 Form Updates Required:</strong> Please review and update the highlighted fields below.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Part I: Taxpayer Identification Number (TIN) */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Part I - Taxpayer Identification Number (TIN)</h4>
                    <p className="text-sm text-gray-600 mb-4">
                        Enter your TIN in the appropriate box. The TIN provided must match the name given on line 1 to avoid backup withholding. 
                        For individuals, this is generally your social security number (SSN). For other entities, it is your employer identification number (EIN).
                    </p>
                </div>

                {/* Line 1: Name */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 1: Name of entity/individual
                    </label>
                    <div className={isFieldRejected('w9_business_name') ? 'ring-2 ring-red-500 rounded-lg p-1 bg-red-50' : ''}>
                        <Input
                            type="text"
                            value={w9Data.business_name}
                            onChange={(e) => handleW9DataChange('business_name', e.target.value)}
                            onBlur={() => handleFieldBlur('business_name')}
                            error={errors.business_name || (isFieldRejected('w9_business_name') ? 'This field needs to be updated' : '')}
                            placeholder="Enter your full name or business name"
                            required
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        An entry is required. (For a sole proprietor or disregarded entity, enter the owner's name on line 1, and enter the business/disregarded entity's name on line 2.)
                    </p>
                </div>

                {/* Line 2: Business name (if different) */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 2: Business name/disregarded entity name, if different from above
                    </label>
                    <Input
                        type="text"
                        value={w9Data.business_name_alt || ''}
                        onChange={(e) => handleW9DataChange('business_name_alt', e.target.value)}
                        onBlur={() => handleFieldBlur('business_name_alt')}
                        placeholder="Enter business name if different from above"
                    />
                </div>

                {/* Line 3a: Federal tax classification */}
                <div className={`mb-4 ${isFieldRejected('w9_tax_classification') ? 'ring-2 ring-red-500 rounded-lg p-3 bg-red-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 3a: Check appropriate box for federal tax classification
                        {isFieldRejected('w9_tax_classification') && <span className="ml-2 text-red-600 text-sm">⚠ Needs update</span>}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Check only one of the following seven boxes.</p>
                    <div className="space-y-2">
                        {[
                            { value: 'individual', label: 'Individual/sole proprietor' },
                            { value: 'c_corporation', label: 'C corporation' },
                            { value: 's_corporation', label: 'S corporation' },
                            { value: 'partnership', label: 'Partnership' },
                            { value: 'trust_estate', label: 'Trust/estate' },
                            { value: 'llc', label: 'LLC' },
                            { value: 'other', label: 'Other (see instructions)' }
                        ].map((option) => (
                            <label key={option.value} className="flex items-center">
                                <input
                                    type="radio"
                                    name="tax_classification"
                                    value={option.value}
                                    checked={w9Data.tax_classification === option.value}
                                    onChange={(e) => {
                                        handleW9DataChange('tax_classification', e.target.value);
                                        // Re-validate SSN/EIN fields when tax classification changes
                                        setTimeout(() => {
                                            handleFieldBlur('ssn');
                                            handleFieldBlur('ein');
                                            handleFieldBlur('llc_classification');
                                        }, 100);
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                            </label>
                        ))}
                    </div>
                    {w9Data.tax_classification === 'llc' && (
                        <div className="mt-2 ml-6">
                            <Select
                                value={w9Data.llc_classification || ''}
                                onChange={(e) => {
                                    handleW9DataChange('llc_classification', e.target.value);
                                    setTimeout(() => handleFieldBlur('llc_classification'), 100);
                                }}
                                error={errors.llc_classification}
                                options={[
                                    { value: 'C', label: 'C Corporation' },
                                    { value: 'S', label: 'S Corporation' },
                                    { value: 'P', label: 'Partnership' }
                                ]}
                                placeholder="Select LLC classification"
                                className="text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Note: A disregarded entity should instead check the appropriate box for the tax classification of its owner.
                            </p>
                        </div>
                    )}
                    {errors.tax_classification && (
                        <p className="text-red-500 text-sm mt-1">{errors.tax_classification}</p>
                    )}
                </div>

                {/* Line 3b: Foreign partners checkbox */}
                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={w9Data.has_foreign_partners || false}
                            onChange={(e) => handleW9DataChange('has_foreign_partners', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Line 3b: If on line 3a you checked "Partnership" or "Trust/estate," or checked "LLC" and entered "P" as its tax classification, 
                            and you are providing this form to a partnership, trust, or estate in which you have an ownership interest, check this box if you have any foreign partners, owners, or beneficiaries.
                        </span>
                    </label>
                </div>

                {/* Line 4: Exemptions */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Line 4: Exemptions (codes apply only to certain entities, not individuals; see instructions on page 3)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Exempt payee code (if any)</label>
                            <Input
                                type="text"
                                value={w9Data.exempt_payee_code || ''}
                                onChange={(e) => handleW9DataChange('exempt_payee_code', e.target.value)}
                                placeholder="Exempt payee code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Exemption from FATCA reporting code (if any)</label>
                            <Input
                                type="text"
                                value={w9Data.fatca_exemption_code || ''}
                                onChange={(e) => handleW9DataChange('fatca_exemption_code', e.target.value)}
                                placeholder="FATCA exemption code"
                            />
                            <p className="text-xs text-gray-500 mt-1">(Applies to accounts maintained outside the United States.)</p>
                        </div>
                    </div>
                </div>

                {/* Line 5: Address */}
                <div className={`mb-4 ${isFieldRejected('w9_address') ? 'ring-2 ring-red-500 rounded-lg p-3 bg-red-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 5: Address (number, street, and apt. or suite no.)
                        {isFieldRejected('w9_address') && <span className="ml-2 text-red-600 text-sm">⚠ Needs update</span>}
                    </label>
                    <Input
                        type="text"
                        value={w9Data.address}
                        onChange={(e) => handleW9DataChange('address', e.target.value)}
                        onBlur={() => handleFieldBlur('address')}
                        error={errors.address || (isFieldRejected('w9_address') ? 'This field needs to be updated' : '')}
                        placeholder="Street address"
                        required
                    />
                </div>

                {/* Line 6: City, state, and ZIP code */}
                <div className={`mb-4 ${isFieldRejected('w9_address') ? 'ring-2 ring-red-500 rounded-lg p-3 bg-red-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 6: City, state, and ZIP code
                        {isFieldRejected('w9_address') && <span className="ml-2 text-red-600 text-sm">⚠ Needs update</span>}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Input
                                type="text"
                                value={w9Data.city}
                                onChange={(e) => handleW9DataChange('city', e.target.value)}
                                onBlur={() => handleFieldBlur('city')}
                                error={errors.city || (isFieldRejected('w9_city') ? 'This field needs to be updated' : '')}
                                placeholder="City"
                                required
                            />
                        </div>
                        <div>
                            <Select
                                value={w9Data.state}
                                onChange={(e) => {
                                    handleW9DataChange('state', e.target.value);
                                    // Validate immediately when state changes
                                    setTimeout(() => handleFieldBlur('state'), 100);
                                }}
                                error={errors.state || (isFieldRejected('w9_state') ? 'This field needs to be updated' : '')}
                                required
                                options={usStates}
                                placeholder="State"
                            />
                        </div>
                        <div>
                            <Input
                                type="text"
                                value={w9Data.zip_code}
                                onChange={(e) => handleW9DataChange('zip_code', e.target.value)}
                                onBlur={() => handleFieldBlur('zip_code')}
                                error={errors.zip_code || (isFieldRejected('w9_zip_code') ? 'This field needs to be updated' : '')}
                                placeholder="ZIP code (12345 or 12345-6789)"
                                pattern="^\d{5}(-\d{4})?$"
                                title="ZIP code must be in format 12345 or 12345-6789"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Line 7: Account number (optional) */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line 7: List account number(s) here (optional)
                    </label>
                    <Input
                        type="text"
                        value={w9Data.account_number || ''}
                        onChange={(e) => handleW9DataChange('account_number', e.target.value)}
                        placeholder="Account number"
                    />
                </div>

                {/* TIN Section */}
                <div className={`mb-6 ${isFieldRejected('w9_ssn') || isFieldRejected('w9_ein') ? 'ring-2 ring-red-500 rounded-lg p-3 bg-red-50' : ''}`}>
                    <h5 className="text-md font-medium text-gray-700 mb-3">
                        Taxpayer Identification Number
                        {(isFieldRejected('w9_ssn') || isFieldRejected('w9_ein')) && <span className="ml-2 text-red-600 text-sm">⚠ Needs update</span>}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Social security number</label>
                            <Input
                                type="text"
                                value={w9Data.ssn}
                                onChange={(e) => handleW9DataChange('ssn', e.target.value)}
                                onBlur={() => handleFieldBlur('ssn')}
                                error={errors.ssn || (isFieldRejected('w9_ssn') ? 'This field needs to be updated' : '')}
                                placeholder="XXX-XX-XXXX"
                                pattern="^\d{3}-\d{2}-\d{4}$"
                                title="SSN must be in format XXX-XX-XXXX"
                                required={false}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employer identification number</label>
                            <Input
                                type="text"
                                value={w9Data.ein}
                                onChange={(e) => handleW9DataChange('ein', e.target.value)}
                                onBlur={() => handleFieldBlur('ein')}
                                error={errors.ein || (isFieldRejected('w9_ein') ? 'This field needs to be updated' : '')}
                                placeholder="XX-XXXXXXX"
                                pattern="^\d{2}-\d{7}$"
                                title="EIN must be in format XX-XXXXXXX"
                                required={false}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        <strong>Note:</strong> Either SSN or EIN is required (at least one). If the account is in more than one name, see the instructions for line 1. See also What Name and Number To Give the Requester for guidelines on whose number to enter.
                    </p>
                </div>
            </div>

            {/* Part II: Certification */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Part II - Certification</h4>
                    <p className="text-sm text-gray-600 mb-4">Under penalties of perjury, I certify that:</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-700 mr-2">1.</span>
                        <p className="text-sm text-gray-700">
                            The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and
                        </p>
                    </div>
                    <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-700 mr-2">2.</span>
                        <p className="text-sm text-gray-700">
                            I am not subject to backup withholding because (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and
                        </p>
                    </div>
                    <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-700 mr-2">3.</span>
                        <p className="text-sm text-gray-700">
                            I am a U.S. citizen or other U.S. person (defined below); and
                        </p>
                    </div>
                    <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-700 mr-2">4.</span>
                        <p className="text-sm text-gray-700">
                            The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.
                        </p>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signature of U.S. person</label>
                            <Input
                                type="text"
                                value={w9Data.signature || ''}
                                onChange={(e) => handleW9DataChange('signature', e.target.value)}
                                onBlur={() => handleFieldBlur('signature')}
                                error={errors.signature}
                                placeholder="Type your full name to sign"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Type your full name to electronically sign</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <Input
                                type="date"
                                value={w9Data.signature_date || ''}
                                onChange={(e) => handleW9DataChange('signature_date', e.target.value)}
                                onBlur={() => handleFieldBlur('signature_date')}
                                error={errors.signature_date}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Must be today's date ({new Date().toLocaleDateString()})</p>
                        </div>
                    </div>
                    
                    {/* Electronic Signature Acknowledgment */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                checked={w9Data.electronic_signature_acknowledgment || false}
                                onChange={(e) => {
                                    handleW9DataChange('electronic_signature_acknowledgment', e.target.checked);
                                    setTimeout(() => handleFieldBlur('electronic_signature_acknowledgment'), 100);
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                                required
                            />
                            <span className="ml-3 text-sm text-gray-700">
                                <strong>Electronic Signature Acknowledgment:</strong> By checking this box and typing my name above, 
                                I acknowledge that this constitutes my electronic signature and is legally binding. I certify that the 
                                information provided on this form is true, accurate, and complete to the best of my knowledge. I understand 
                                that this electronic signature has the same legal effect as a handwritten signature and that I may be subject 
                                to penalties for providing false information.
                            </span>
                        </label>
                        {errors.electronic_signature_acknowledgment && (
                            <p className="text-red-500 text-sm mt-1">{errors.electronic_signature_acknowledgment}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Auto-populate profile information button */}
            {(formData.first_name || formData.street_address || formData.city || formData.state_id || formData.zip_code) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Button
                        onClick={() => {
                            const fullName = [formData.first_name, formData.middle_name, formData.last_name]
                                .filter(Boolean)
                                .join(' ');
                            
                            setW9Data(prev => ({
                                ...prev,
                                business_name: prev.business_name || fullName || '',
                                address: formData.street_address || prev.address,
                                city: formData.city || prev.city,
                                state: formData.state_id || prev.state,
                                zip_code: formData.zip_code || prev.zip_code
                            }));
                            toast.success('Profile information populated from your profile');
                        }}
                        variant="outline"
                        size="sm"
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                        Use Profile Information
                    </Button>
                </div>
            )}

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• The W-9 form is required for tax reporting purposes</li>
                    <li>• Ensure all information is accurate and up-to-date</li>
                    <li>• Your SSN or EIN will be used for 1099 tax reporting</li>
                    <li>• This information is kept secure and confidential</li>
                    <li>• All required fields must be completed to proceed</li>
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
                    >
                        {isEditing ? 'Save & Return to Review' : 'Next'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default W9FormStep; 