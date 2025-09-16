import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { DOCUMENT_TYPES } from '../../utils/constants';

const DocumentsStep = ({ data, onNext, onPrevious, onUpdate }) => {
  const [documents, setDocuments] = useState(data.documents || {});
  const [uploadErrors, setUploadErrors] = useState({});

  React.useEffect(() => {
    onUpdate({ documents });
  }, [documents, onUpdate]);

  const handleFileSelect = (documentType, file) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: [...(prev[documentType] || []), file]
    }));
    
    // Clear any previous error for this document type
    setUploadErrors(prev => ({
      ...prev,
      [documentType]: null
    }));
  };

  const handleFileRemove = (documentType, fileIndex) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: prev[documentType]?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  const validateDocuments = () => {
    const errors = {};
    let hasErrors = false;

    DOCUMENT_TYPES.forEach(docType => {
      if (docType.required && (!documents[docType.value] || documents[docType.value].length === 0)) {
        errors[docType.value] = `${docType.label} is required`;
        hasErrors = true;
      }
    });

    setUploadErrors(errors);
    return !hasErrors;
  };

  const handleNext = () => {
    if (validateDocuments()) {
      onNext({ documents });
    }
  };

  const getDocumentStatus = (documentType) => {
    const files = documents[documentType.value];
    const hasFiles = files && files.length > 0;
    
    if (documentType.required) {
      return hasFiles ? 'complete' : 'required';
    }
    return hasFiles ? 'complete' : 'optional';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'required':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'border-green-200 bg-green-50';
      case 'required':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Upload</h2>
        <p className="text-gray-600">
          Please upload the required documents to complete your application.
        </p>
      </div>

      {/* Document Upload Status Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Upload Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DOCUMENT_TYPES.map((docType) => {
            const status = getDocumentStatus(docType);
            return (
              <div
                key={docType.value}
                className={`flex items-center space-x-2 p-2 rounded-md border ${getStatusColor(status)}`}
              >
                {getStatusIcon(status)}
                <span className={`text-sm font-medium ${
                  status === 'complete' ? 'text-green-700' :
                  status === 'required' ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {docType.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Upload Sections */}
      <div className="space-y-6">
        {DOCUMENT_TYPES.map((docType) => (
          <motion.div
            key={docType.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  {docType.label}
                  {docType.required && <span className="text-red-500 ml-1">*</span>}
                  <span className="ml-2">{getStatusIcon(getDocumentStatus(docType))}</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">{docType.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: {docType.acceptedFormats}
                </p>
              </div>
            </div>

            <FileUpload
              onFileSelect={(file) => handleFileSelect(docType.value, file)}
              onFileRemove={(fileIndex) => handleFileRemove(docType.value, fileIndex)}
              acceptedTypes={docType.acceptedFormats}
              maxSizeMB={10}
              multiple={false}
              files={documents[docType.value] || []}
              error={uploadErrors[docType.value]}
              required={docType.required}
            />
          </motion.div>
        ))}
      </div>

      {/* Upload Guidelines */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-md font-medium text-gray-900 mb-3">Document Guidelines</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            All documents must be clear and legible
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            File size limit: 10MB per document
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            PDF format is preferred for official documents
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            All personal information must be visible and unredacted
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Documents will be verified by our team before approval
          </li>
        </ul>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
        >
          Previous
        </Button>
        
        <Button
          type="button"
          onClick={handleNext}
        >
          Continue to Review
        </Button>
      </div>
    </motion.div>
  );
};

export default DocumentsStep;