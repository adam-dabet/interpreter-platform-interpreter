import React, { useState } from 'react';
import { PlusIcon, TrashIcon, DocumentIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import toast from 'react-hot-toast';

const CertificatesStep = ({ formData, onNext, onPrevious, isFirstStep, isEditing, parametricData, rejectedFields = [], onUpdate }) => {
    const [isCertified, setIsCertified] = useState(formData.is_certified ?? null); // null, true, false
    const [certificates, setCertificates] = useState(formData.certificates || []);
    const [certificateFiles, setCertificateFiles] = useState(formData.certificateFiles || []);
    const [errors, setErrors] = useState({});
    
    // Helper to check if field is rejected
    const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

    const handleCertificationStatusChange = (status) => {
        setIsCertified(status);
        
        // Clear certificates if user selects "not certified"
        if (status === false) {
            setCertificates([]);
            setCertificateFiles([]);
        }
        
        // Clear errors
        setErrors({});
    };

    const handleAddCertificate = () => {
        const newCertificate = {
            id: Date.now(), // Temporary ID
            certificate_type_id: '',
            certificate_number: '',
            issuing_organization: '',
            issue_date: '',
            expiry_date: '',
            issuing_state_id: '', // For both State Court and Administrative Court Certification
            show_custom_org: false, // For Medical Certification custom organization input
            file: null,
            fileName: ''
        };

        setCertificates(prev => [...prev, newCertificate]);
    };

    const handleRemoveCertificate = (certificateId) => {
        setCertificates(prev => prev.filter(cert => cert.id !== certificateId));
        
        // Also remove associated file
        setCertificateFiles(prev => prev.filter((_, index) => {
            const cert = certificates.find(c => c.id === certificateId);
            const certIndex = certificates.indexOf(cert);
            return index !== certIndex;
        }));
    };

    const handleCertificateChange = (certificateId, field, value) => {
        setCertificates(prev => prev.map(cert => 
            cert.id === certificateId 
                ? { ...cert, [field]: value }
                : cert
        ));

        // Clear specific error
        if (errors[`certificate_${certificateId}_${field}`]) {
            setErrors(prev => ({ ...prev, [`certificate_${certificateId}_${field}`]: null }));
        }
    };

    const handleFileUpload = (certificateId, file) => {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only PDF, JPG, and PNG files are allowed');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        // Update certificate with file info
        handleCertificateChange(certificateId, 'file', file);
        handleCertificateChange(certificateId, 'fileName', file.name);

        // Update files array
        const certificateIndex = certificates.findIndex(cert => cert.id === certificateId);
        if (certificateIndex !== -1) {
            setCertificateFiles(prev => {
                const newFiles = [...prev];
                newFiles[certificateIndex] = file;
                return newFiles;
            });
        }

        toast.success('File uploaded successfully');
    };

    const validateForm = () => {
        const newErrors = {};

        // Check if certification status is selected
        if (isCertified === null) {
            newErrors.certification_status = 'Please select whether you are certified or not';
            setErrors(newErrors);
            return false;
        }

        // If not certified, no further validation needed
        if (isCertified === false) {
            setErrors(newErrors);
            return true;
        }

        // If certified, validate certificates
        if (certificates.length === 0) {
            newErrors.certificates = 'Please add at least one certification';
        } else {
            // Validate each certificate
            certificates.forEach(cert => {
                if (!cert.certificate_type_id) {
                    newErrors[`certificate_${cert.id}_certificate_type_id`] = 'Certificate type is required';
                }
                
                if (!cert.certificate_number?.trim()) {
                    newErrors[`certificate_${cert.id}_certificate_number`] = 'Certificate number is required';
                }
                
                if (!cert.issuing_organization?.trim()) {
                    newErrors[`certificate_${cert.id}_issuing_organization`] = 'Issuing organization is required';
                }
                
                if (!cert.expiry_date) {
                    newErrors[`certificate_${cert.id}_expiry_date`] = 'Expiration date is required';
                } else {
                    // Check if certificate is already expired
                    const expiryDate = new Date(cert.expiry_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
                    
                    if (expiryDate < today) {
                        newErrors[`certificate_${cert.id}_expiry_date`] = 'Certificate has already expired. Please provide a valid certification.';
                    }
                    
                    // Check if expiry date is after issue date
                    if (cert.issue_date && new Date(cert.issue_date) >= expiryDate) {
                        newErrors[`certificate_${cert.id}_expiry_date`] = 'Expiry date must be after issue date';
                    }
                }

                // Validate state selection for State Court Certification and Administrative Court Certification
                const certificateType = parametricData?.certificateTypes?.find(ct => ct.id === cert.certificate_type_id);
                if ((certificateType?.code === 'court_certified' || certificateType?.code === 'ata_certified') && 
                    (!cert.issuing_state_id || cert.issuing_state_id === '')) {
                    newErrors[`certificate_${cert.id}_issuing_state_id`] = 'Please select the state for this certification';
                }
            });
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

        // Filter out empty certificates
        const validCertificates = certificates.filter(cert => 
            cert.certificate_type_id && cert.certificate_number && cert.issuing_organization && cert.expiry_date
        );

        const validFiles = validCertificates.map(cert => cert.file);

        const certificateData = {
            is_certified: isCertified,
            certificates: validCertificates,
            certificateFiles: validFiles
        };

        // If editing, update formData and return to review
        if (isEditing && onUpdate) {
            onUpdate(certificateData);
            toast.success('Certificate changes saved!');
            // Navigate back to review step - onNext will handle navigation when isEditingFromReview is true
            onNext();
        } else {
            onNext(certificateData);
        }
    };

    const getCertificateTypeName = (typeId) => {
        const type = parametricData?.certificateTypes?.find(ct => ct.id === parseInt(typeId));
        return type ? type.name : '';
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Certification Status
                </h3>
                <p className="text-gray-600 mb-6">
                    Please let us know if you are certified or qualified as an interpreter.
                </p>
            </div>

            {/* Certification Status Selection */}
            <div className="space-y-4">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isFieldRejected('certificates') ? 'ring-2 ring-red-500 rounded-lg p-2 bg-red-50' : ''}`}>
                    <div
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                            isCertified === true
                                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleCertificationStatusChange(true)}
                    >
                        <div className="flex items-center">
                            <CheckCircleIcon className={`w-8 h-8 mr-4 ${
                                isCertified === true ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <div>
                                <h4 className={`font-medium text-lg ${
                                    isCertified === true ? 'text-green-900' : 'text-gray-900'
                                }`}>
                                    Yes, I am certified
                                </h4>
                                <p className={`text-sm mt-1 ${
                                    isCertified === true ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                    I have professional certifications or qualifications
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                            isCertified === false
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleCertificationStatusChange(false)}
                    >
                        <div className="flex items-center">
                            <div className={`w-8 h-8 mr-4 rounded-full border-2 flex items-center justify-center ${
                                isCertified === false ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                            }`}>
                                {isCertified === false && (
                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                )}
                            </div>
                            <div>
                                <h4 className={`font-medium text-lg ${
                                    isCertified === false ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                    No, I am not certified
                                </h4>
                                <p className={`text-sm mt-1 ${
                                    isCertified === false ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                    I do not have professional certifications yet
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {errors.certification_status && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-800 text-sm">{errors.certification_status}</p>
                    </div>
                )}
            </div>

            {/* Certification Details (only show if certified) */}
            {isCertified === true && (
                <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">Certification Details</h4>
                        <p className="text-sm text-green-800">
                            Please provide details for each of your certifications. Certificate number, issuing organization, and expiration date are required.
                        </p>
                    </div>

                    {errors.certificates && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{errors.certificates}</p>
                        </div>
                    )}

                    {/* Certificates List */}
                    <div className="space-y-4">
                        {certificates.map((certificate, index) => (
                            <div key={certificate.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-gray-900">
                                        Certification {index + 1}
                                    </h4>
                                    <Button
                                        onClick={() => handleRemoveCertificate(certificate.id)}
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Select
                                            label="Certificate Type"
                                            value={certificate.certificate_type_id || ''}
                                            onChange={(e) => handleCertificateChange(certificate.id, 'certificate_type_id', e.target.value ? parseInt(e.target.value) : '')}
                                            error={errors[`certificate_${certificate.id}_certificate_type_id`]}
                                            required
                                            options={parametricData?.certificateTypes?.map(type => ({
                                                value: type.id,
                                                label: type.name
                                            })) || []}
                                            placeholder="Select Certificate Type"
                                        />
                                    </div>

                                    <div>
                                        <Input
                                            label="Certificate Number"
                                            type="text"
                                            value={certificate.certificate_number}
                                            onChange={(e) => handleCertificateChange(certificate.id, 'certificate_number', e.target.value)}
                                            error={errors[`certificate_${certificate.id}_certificate_number`]}
                                            placeholder="Enter certificate number"
                                            required
                                        />
                                    </div>

                                    <div>
                                        {/* Conditional rendering for Medical Certification - show dropdown with custom option */}
                                        {certificate.certificate_type_id && 
                                         parametricData?.certificateTypes?.find(ct => ct.id === certificate.certificate_type_id)?.code === 'medical_certified' ? (
                                            <>
                                                <Select
                                                    label="Issuing Organization"
                                                    value={
                                                        certificate.show_custom_org 
                                                            ? 'other'
                                                            : (certificate.issuing_organization === 'CCHI' || 
                                                               certificate.issuing_organization === 'NBCMI' || 
                                                               certificate.issuing_organization === 'CAL-HR(SPB)' 
                                                                ? certificate.issuing_organization 
                                                                : (certificate.issuing_organization ? 'other' : ''))
                                                    }
                                                    onChange={(e) => {
                                                        if (e.target.value === 'other') {
                                                            handleCertificateChange(certificate.id, 'show_custom_org', true);
                                                            handleCertificateChange(certificate.id, 'issuing_organization', '');
                                                        } else {
                                                            handleCertificateChange(certificate.id, 'show_custom_org', false);
                                                            handleCertificateChange(certificate.id, 'issuing_organization', e.target.value);
                                                        }
                                                    }}
                                                    error={errors[`certificate_${certificate.id}_issuing_organization`]}
                                                    required
                                                    placeholder="Select Organization"
                                                    options={[
                                                        { value: 'CCHI', label: 'CCHI' },
                                                        { value: 'NBCMI', label: 'NBCMI' },
                                                        { value: 'CAL-HR(SPB)', label: 'CAL-HR(SPB)' },
                                                        { value: 'other', label: 'Other (specify below)' }
                                                    ]}
                                                />
                                                {/* Show custom input if 'other' is selected or if there's a custom value */}
                                                {(certificate.show_custom_org || 
                                                  (certificate.issuing_organization && 
                                                   certificate.issuing_organization !== 'CCHI' && 
                                                   certificate.issuing_organization !== 'NBCMI' && 
                                                   certificate.issuing_organization !== 'CAL-HR(SPB)')) && (
                                                    <div className="mt-3">
                                                        <Input
                                                            label="Custom Organization Name"
                                                            type="text"
                                                            value={certificate.issuing_organization || ''}
                                                            onChange={(e) => handleCertificateChange(certificate.id, 'issuing_organization', e.target.value)}
                                                            error={errors[`certificate_${certificate.id}_issuing_organization`]}
                                                            placeholder="Enter organization name"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Input
                                                label="Issuing Organization"
                                                type="text"
                                                value={certificate.issuing_organization || ''}
                                                onChange={(e) => handleCertificateChange(certificate.id, 'issuing_organization', e.target.value)}
                                                error={errors[`certificate_${certificate.id}_issuing_organization`]}
                                                placeholder="Enter organization name"
                                                required
                                            />
                                        )}
                                    </div>

                                    {/* State Selection for State Court Certification */}
                                    {certificate.certificate_type_id && 
                                     parametricData?.certificateTypes?.find(ct => ct.id === certificate.certificate_type_id)?.code === 'court_certified' && (
                                        <div className="md:col-span-2">
                                            <Select
                                                label="Issuing State"
                                                value={certificate.issuing_state_id || ''}
                                                onChange={(e) => handleCertificateChange(certificate.id, 'issuing_state_id', e.target.value ? parseInt(e.target.value) : '')}
                                                error={errors[`certificate_${certificate.id}_issuing_state_id`]}
                                                required
                                                placeholder="Select State"
                                                options={parametricData?.usStates?.map(state => ({
                                                    value: state.id,
                                                    label: state.name
                                                })) || []}
                                            />
                                        </div>
                                    )}

                                    {/* Issuing State Selection for Administrative Court Certification */}
                                    {certificate.certificate_type_id && 
                                     parametricData?.certificateTypes?.find(ct => ct.id === certificate.certificate_type_id)?.code === 'ata_certified' && (
                                        <div className="md:col-span-2">
                                            <Select
                                                label="Issuing State"
                                                value={certificate.issuing_state_id || ''}
                                                onChange={(e) => handleCertificateChange(certificate.id, 'issuing_state_id', e.target.value ? parseInt(e.target.value) : '')}
                                                error={errors[`certificate_${certificate.id}_issuing_state_id`]}
                                                required
                                                placeholder="Select State"
                                                options={parametricData?.usStates?.map(state => ({
                                                    value: state.id,
                                                    label: state.name
                                                })) || []}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Input
                                            label="Issue Date"
                                            type="date"
                                            value={certificate.issue_date}
                                            onChange={(e) => handleCertificateChange(certificate.id, 'issue_date', e.target.value)}
                                            placeholder="Issue date (optional)"
                                        />
                                    </div>

                                    <div>
                                        <Input
                                            label="Expiration Date"
                                            type="date"
                                            value={certificate.expiry_date}
                                            onChange={(e) => handleCertificateChange(certificate.id, 'expiry_date', e.target.value)}
                                            error={errors[`certificate_${certificate.id}_expiry_date`]}
                                            placeholder="Expiration date"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Certificate File (Optional)
                                        </label>
                                        
                                        {certificate.file ? (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                                                <div className="flex items-center">
                                                    <DocumentIcon className="w-5 h-5 text-green-600 mr-2" />
                                                    <div>
                                                        <p className="text-sm font-medium text-green-800">
                                                            {certificate.fileName}
                                                        </p>
                                                        <p className="text-xs text-green-600">
                                                            {formatFileSize(certificate.file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => {
                                                        handleCertificateChange(certificate.id, 'file', null);
                                                        handleCertificateChange(certificate.id, 'fileName', '');
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <FileUpload
                                                onFileSelect={(file) => handleFileUpload(certificate.id, file)}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                maxSize={10 * 1024 * 1024} // 10MB
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Certificate Button */}
                    <Button
                        onClick={handleAddCertificate}
                        variant="outline"
                        className="w-full border-dashed border-2 hover:bg-gray-50"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Another Certification
                    </Button>
                </div>
            )}

            {/* Not Certified Message */}
            {isCertified === false && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="w-8 h-8 mr-4 rounded-full bg-blue-100 flex items-center justify-center">
                            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-900">No Certifications Required</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                You can proceed without certifications. You may still be considered for opportunities based on your experience and language skills.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* File Upload Guidelines */}
            {isCertified === true && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">File Upload Guidelines:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Accepted formats: PDF, JPG, PNG</li>
                        <li>• Maximum file size: 10MB per file</li>
                        <li>• Ensure documents are clear and readable</li>
                        <li>• Certificate files are optional but recommended</li>
                    </ul>
                </div>
            )}

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
                        disabled={isCertified === null}
                    >
                        {isEditing ? 'Save & Return to Review' : 'Next'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CertificatesStep;