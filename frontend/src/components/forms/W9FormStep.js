import React, { useState } from 'react';
import { DocumentIcon, CloudArrowUpIcon, PencilIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import toast from 'react-hot-toast';

const W9FormStep = ({ formData, onNext, onPrevious, isFirstStep, isEditing }) => {
    const [entryMethod, setEntryMethod] = useState(formData.w9_entry_method || 'upload'); // 'upload' or 'manual'
    const [w9File, setW9File] = useState(formData.w9_file || null);
    
    // Initialize W9 data with address from formData if available
    const getInitialW9Data = () => {
        const existingW9Data = formData.w9_data || {};
        
        // Create full name from first and last name
        const fullName = [formData.first_name, formData.middle_name, formData.last_name]
            .filter(Boolean)
            .join(' ');
        
        return {
            business_name: existingW9Data.business_name || fullName || '',
            business_type: existingW9Data.business_type || 'individual',
            tax_classification: existingW9Data.tax_classification || 'individual',
            ssn: existingW9Data.ssn || '',
            ein: existingW9Data.ein || '',
            address: existingW9Data.address || formData.street_address || '',
            city: existingW9Data.city || formData.city || '',
            state: existingW9Data.state || formData.state_id || '',
            zip_code: existingW9Data.zip_code || formData.zip_code || '',
            exempt_payee_code: existingW9Data.exempt_payee_code || '',
            exempt_from_fatca: existingW9Data.exempt_from_fatca || false,
            exempt_from_backup_withholding: existingW9Data.exempt_from_backup_withholding || false
        };
    };
    
    const [w9Data, setW9Data] = useState(getInitialW9Data());
    const [errors, setErrors] = useState({});

    const handleEntryMethodChange = (method) => {
        setEntryMethod(method);
        // Clear errors when switching methods
        setErrors({});
        
        // Auto-populate address fields when switching to manual entry
        if (method === 'manual') {
            const fullName = [formData.first_name, formData.middle_name, formData.last_name]
                .filter(Boolean)
                .join(' ');
            
            setW9Data(prev => ({
                ...prev,
                business_name: prev.business_name || fullName || '',
                address: prev.address || formData.street_address || '',
                city: prev.city || formData.city || '',
                state: prev.state || formData.state_id || '',
                zip_code: prev.zip_code || formData.zip_code || ''
            }));
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;

        // Validate file type (only PDF)
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed for W-9 forms');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setW9File(file);
        toast.success('W-9 form uploaded successfully');
    };

    const handleW9DataChange = (field, value) => {
        setW9Data(prev => ({ ...prev, [field]: value }));
        
        // Clear specific error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (entryMethod === 'upload') {
            if (!w9File) {
                newErrors.w9_file = 'Please upload a W-9 form';
            }
        } else {
            // Manual entry validation
            if (!w9Data.business_name?.trim()) {
                newErrors.business_name = 'Business name is required';
            }
            
            if (!w9Data.tax_classification) {
                newErrors.tax_classification = 'Tax classification is required';
            }
            
            if (w9Data.tax_classification === 'individual' && !w9Data.ssn?.trim()) {
                newErrors.ssn = 'SSN is required for individual tax classification';
            }
            
            if (w9Data.tax_classification !== 'individual' && !w9Data.ein?.trim()) {
                newErrors.ein = 'EIN is required for business tax classification';
            }
            
            if (!w9Data.address?.trim()) {
                newErrors.address = 'Address is required';
            }
            
            if (!w9Data.city?.trim()) {
                newErrors.city = 'City is required';
            }
            
            if (!w9Data.state?.trim()) {
                newErrors.state = 'State is required';
            }
            
            if (!w9Data.zip_code?.trim()) {
                newErrors.zip_code = 'ZIP code is required';
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
            w9_entry_method: entryMethod,
            w9_file: w9File,
            w9_data: entryMethod === 'manual' ? w9Data : null
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const businessTypes = [
        { value: 'individual', label: 'Individual' },
        { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
        { value: 'llc', label: 'LLC' },
        { value: 'corporation', label: 'Corporation' }
    ];

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

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    W-9 Tax Form
                </h3>
                <p className="text-gray-600 mb-6">
                    Please provide your W-9 tax form information. You can either upload a completed W-9 form or enter the details manually.
                </p>
            </div>

            {/* Entry Method Selection */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Choose Entry Method:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                            entryMethod === 'upload'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleEntryMethodChange('upload')}
                    >
                        <div className="flex items-center">
                            <CloudArrowUpIcon className="w-6 h-6 text-blue-600 mr-3" />
                            <div>
                                <h5 className="font-medium text-gray-900">Upload W-9 Form</h5>
                                <p className="text-sm text-gray-600">Upload a completed W-9 PDF form</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                            entryMethod === 'manual'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleEntryMethodChange('manual')}
                    >
                        <div className="flex items-center">
                            <PencilIcon className="w-6 h-6 text-blue-600 mr-3" />
                            <div>
                                <h5 className="font-medium text-gray-900">Enter Details Manually</h5>
                                <p className="text-sm text-gray-600">Fill out W-9 information manually</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Method */}
            {entryMethod === 'upload' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Upload W-9 Form</h4>
                        <p className="text-sm text-blue-800">
                            Please upload a completed and signed W-9 form in PDF format.
                        </p>
                    </div>

                    {w9File ? (
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                                <DocumentIcon className="w-6 h-6 text-green-600 mr-3" />
                                <div>
                                    <p className="font-medium text-green-800">{w9File.name}</p>
                                    <p className="text-sm text-green-600">{formatFileSize(w9File.size)}</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setW9File(null)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                            >
                                Remove
                            </Button>
                        </div>
                    ) : (
                        <FileUpload
                            onFileSelect={handleFileUpload}
                            accept=".pdf"
                            maxSize={5 * 1024 * 1024} // 5MB
                            error={errors.w9_file}
                        />
                    )}
                </div>
            )}

            {/* Manual Entry Method */}
            {entryMethod === 'manual' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Manual W-9 Entry</h4>
                        <p className="text-sm text-blue-800">
                            Please fill out the W-9 form information manually. All required fields are marked with an asterisk (*).
                        </p>
                        
                        {/* Auto-populate profile information button */}
                        {(formData.first_name || formData.street_address || formData.city || formData.state_id || formData.zip_code) && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Business Name or Individual Name"
                                type="text"
                                value={w9Data.business_name}
                                onChange={(e) => handleW9DataChange('business_name', e.target.value)}
                                error={errors.business_name}
                                placeholder="Enter your full name or business name"
                                required
                            />
                        </div>

                        <div>
                            <Select
                                label="Tax Classification"
                                value={w9Data.tax_classification}
                                onChange={(e) => handleW9DataChange('tax_classification', e.target.value)}
                                error={errors.tax_classification}
                                required
                                options={businessTypes}
                                placeholder="Select tax classification"
                            />
                        </div>

                        <div>
                            <Select
                                label="Business Type"
                                value={w9Data.business_type}
                                onChange={(e) => handleW9DataChange('business_type', e.target.value)}
                                options={businessTypes}
                                placeholder="Select business type"
                            />
                        </div>

                        {w9Data.tax_classification === 'individual' ? (
                            <div>
                                <Input
                                    label="Social Security Number (SSN)"
                                    type="text"
                                    value={w9Data.ssn}
                                    onChange={(e) => handleW9DataChange('ssn', e.target.value)}
                                    error={errors.ssn}
                                    placeholder="XXX-XX-XXXX"
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <Input
                                    label="Employer Identification Number (EIN)"
                                    type="text"
                                    value={w9Data.ein}
                                    onChange={(e) => handleW9DataChange('ein', e.target.value)}
                                    error={errors.ein}
                                    placeholder="XX-XXXXXXX"
                                    required
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <Input
                                label="Address"
                                type="text"
                                value={w9Data.address}
                                onChange={(e) => handleW9DataChange('address', e.target.value)}
                                error={errors.address}
                                placeholder="Street address"
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label="City"
                                type="text"
                                value={w9Data.city}
                                onChange={(e) => handleW9DataChange('city', e.target.value)}
                                error={errors.city}
                                placeholder="City"
                                required
                            />
                        </div>

                        <div>
                            <Select
                                label="State"
                                value={w9Data.state}
                                onChange={(e) => handleW9DataChange('state', e.target.value)}
                                error={errors.state}
                                required
                                options={usStates}
                                placeholder="Select state"
                            />
                        </div>

                        <div>
                            <Input
                                label="ZIP Code"
                                type="text"
                                value={w9Data.zip_code}
                                onChange={(e) => handleW9DataChange('zip_code', e.target.value)}
                                error={errors.zip_code}
                                placeholder="ZIP code"
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label="Exempt Payee Code (if applicable)"
                                type="text"
                                value={w9Data.exempt_payee_code}
                                onChange={(e) => handleW9DataChange('exempt_payee_code', e.target.value)}
                                placeholder="Exempt payee code"
                            />
                        </div>
                    </div>

                    {/* Exemptions Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Exemptions (if applicable)</h4>
                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={w9Data.exempt_from_fatca}
                                    onChange={(e) => handleW9DataChange('exempt_from_fatca', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Exempt from FATCA reporting
                                </span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={w9Data.exempt_from_backup_withholding}
                                    onChange={(e) => handleW9DataChange('exempt_from_backup_withholding', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Exempt from backup withholding
                                </span>
                            </label>
                        </div>
                    </div>
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
                        disabled={entryMethod === 'upload' ? !w9File : false}
                    >
                        {isEditing ? 'Save & Return to Review' : 'Next'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default W9FormStep; 