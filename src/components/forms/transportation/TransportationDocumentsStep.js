import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import FileUpload from '../../ui/FileUpload';
import Button from '../../ui/Button';
import {
  TRANSPORTATION_DOCUMENT_TYPES,
  INTEGRITY_CERTIFICATE_HOLDER,
} from '../../../utils/constants';

const CERTIFICATE_HOLDER_NOTICE_KEY = 'hasSeenGeneralLiabilityCertificateNotice';

const CertificateHolderNoticeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="certificate-holder-title">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75"
          aria-hidden="true"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h3 id="certificate-holder-title" className="text-lg font-semibold text-gray-900">
                Certificate holder required
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your General Liability Insurance certificate must list{' '}
                <strong>{INTEGRITY_CERTIFICATE_HOLDER.name}</strong> as the certificate holder
                (additional insured) before you upload it.
              </p>
            </div>
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">Certificate holder information</p>
            <p>{INTEGRITY_CERTIFICATE_HOLDER.name}</p>
            <p>{INTEGRITY_CERTIFICATE_HOLDER.addressLine1}</p>
            <p>{INTEGRITY_CERTIFICATE_HOLDER.cityStateZip}</p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            If your current COI does not include this information, contact your insurance agent
            to add us as certificate holder before submitting your application.
          </p>

          <div className="mt-6">
            <Button type="button" onClick={onClose} className="w-full">
              I understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const buildInitialDocuments = (formData) =>
  TRANSPORTATION_DOCUMENT_TYPES.reduce((acc, doc) => {
    acc[doc.value] = formData[`${doc.value}_file`] || null;
    return acc;
  }, {});

const TransportationDocumentsStep = ({
  formData,
  onNext,
  onPrevious,
  isFirstStep,
  isEditing,
  onUpdate,
  rejectedFields = [],
}) => {
  const [documents, setDocuments] = useState(() => buildInitialDocuments(formData));
  const [uploadErrors, setUploadErrors] = useState({});
  const [showCertificateNotice, setShowCertificateNotice] = useState(false);

  useEffect(() => {
    const hasSeenNotice = sessionStorage.getItem(CERTIFICATE_HOLDER_NOTICE_KEY);
    if (!hasSeenNotice && !isEditing) {
      setShowCertificateNotice(true);
      sessionStorage.setItem(CERTIFICATE_HOLDER_NOTICE_KEY, 'true');
    }
  }, [isEditing]);

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
    const payload = TRANSPORTATION_DOCUMENT_TYPES.reduce((acc, doc) => {
      acc[`${doc.value}_file`] = documents[doc.value];
      return acc;
    }, {});
    onUpdate(payload);
    onNext(payload);
  };

  const getStatus = (docType) => {
    if (documents[docType.value]) return 'complete';
    return docType.required ? 'required' : 'optional';
  };

  return (
    <div className="space-y-6">
      <CertificateHolderNoticeModal
        isOpen={showCertificateNotice}
        onClose={() => setShowCertificateNotice(false)}
      />

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Required Documents</h2>
        <p className="text-gray-600">
          Upload your insurance certificates and business license. Accepted formats: PDF, JPG, PNG (max 10MB).
        </p>
        <button
          type="button"
          onClick={() => setShowCertificateNotice(true)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View certificate holder requirements for General Liability Insurance
        </button>
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
                <div className="flex-1">
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
                    {docType.showCertificateHolderNotice && (
                      <button
                        type="button"
                        onClick={() => setShowCertificateNotice(true)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Certificate holder requirements"
                        aria-label="Certificate holder requirements"
                      >
                        <InformationCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{docType.description}</p>
                  {docType.showCertificateHolderNotice && (
                    <p className="text-sm text-blue-700 mt-1">
                      Must list {INTEGRITY_CERTIFICATE_HOLDER.name} as certificate holder.
                    </p>
                  )}
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
