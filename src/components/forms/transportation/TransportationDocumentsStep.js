import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import FileUpload from '../../ui/FileUpload';
import Button from '../../ui/Button';
import { TRANSPORTATION_DOCUMENT_TYPES } from '../../../utils/constants';

const TransportationDocumentsStep = ({
  formData,
  onNext,
  onPrevious,
  isFirstStep,
  isEditing,
  onUpdate,
  rejectedFields = [],
}) => {
  const [documents, setDocuments] = useState({
    commercial_insurance: formData.commercial_insurance_file || null,
    business_license: formData.business_license_file || null,
  });
  const [uploadErrors, setUploadErrors] = useState({});

  const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

  const handleFileSelect = (documentType, file) => {
    setDocuments((prev) => ({
      ...prev,
      [documentType]: file,
    }));
    setUploadErrors((prev) => ({
      ...prev,
      [documentType]: null,
    }));
  };

  const handleFileRemove = (documentType) => {
    setDocuments((prev) => ({
      ...prev,
      [documentType]: null,
    }));
  };

  const validate = () => {
    const errors = {};
    TRANSPORTATION_DOCUMENT_TYPES.forEach((docType) => {
      if (docType.required && !documents[docType.value]) {
        errors[docType.value] = `${docType.label} is required`;
      }
    });
    setUploadErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const payload = {
      commercial_insurance_file: documents.commercial_insurance,
      business_license_file: documents.business_license,
    };
    onUpdate(payload);
    onNext(payload);
  };

  const getStatus = (docType) => {
    if (documents[docType.value]) return 'complete';
    return docType.required ? 'required' : 'optional';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Required Documents</h2>
        <p className="text-gray-600">
          Upload your commercial insurance and business license. Accepted formats: PDF, JPG, PNG (max 10MB).
        </p>
      </div>

      <div className="space-y-6">
        {TRANSPORTATION_DOCUMENT_TYPES.map((docType) => {
          const status = getStatus(docType);
          const rejected = isFieldRejected(docType.value);
          return (
            <div
              key={docType.value}
              className={`border rounded-lg p-4 ${
                rejected ? 'ring-2 ring-red-500 bg-red-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {status === 'complete' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : status === 'required' ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <h3 className="font-medium text-gray-900">
                      {docType.label}
                      {docType.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{docType.description}</p>
                </div>
              </div>

              <FileUpload
                onFileSelect={(file) => handleFileSelect(docType.value, file)}
                onFileRemove={() => handleFileRemove(docType.value)}
                acceptedTypes={docType.acceptedFormats}
                maxSizeMB={10}
                files={documents[docType.value] ? [documents[docType.value]] : []}
              />

              {uploadErrors[docType.value] && (
                <p className="text-sm text-red-600 mt-2">{uploadErrors[docType.value]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        {!isFirstStep && (
          <Button type="button" variant="secondary" onClick={onPrevious}>
            Previous
          </Button>
        )}
        <Button type="button" onClick={handleNext} className={isFirstStep ? 'ml-auto' : ''}>
          {isEditing ? 'Save Changes' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default TransportationDocumentsStep;
