import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import FileUpload from '../components/ui/FileUpload';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { transportationProviderAPI } from '../services/api';
import {
  TRANSPORTATION_DOCUMENT_TYPES,
  INTEGRITY_CERTIFICATE_HOLDER,
} from '../utils/constants';

const documentMeta = (value) =>
  TRANSPORTATION_DOCUMENT_TYPES.find((doc) => doc.value === value) || {};

const ProviderDocumentUpload = () => {
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      const response = await transportationProviderAPI.getDocumentRequest(token);
      setRequest(response.data);
    } catch (error) {
      setLoadError(
        error.response?.data?.message || 'This upload link is not valid.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleFileSelect = (value, file) => {
    setFiles((prev) => ({ ...prev, [value]: file }));
    setErrors((prev) => ({ ...prev, [value]: null }));
  };

  const handleFileRemove = (value) => {
    setFiles((prev) => ({ ...prev, [value]: null }));
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    request.requested_documents.forEach((doc) => {
      if (!files[doc.value]) {
        nextErrors[doc.value] = `${doc.label} is required`;
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      request.requested_documents.forEach((doc) => {
        formData.append(doc.value, files[doc.value]);
      });
      const response = await transportationProviderAPI.submitDocumentRequest(token, formData);
      setIsComplete(true);
      toast.success(response.data?.message || 'Documents received');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <ExclamationTriangleIcon className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-red-900 mb-2">Link unavailable</h1>
          <p className="text-red-800">{loadError}</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-900 mb-2">Documents received</h1>
          <p className="text-green-800">
            Thank you. Your documents are on file and no further action is needed.
          </p>
        </div>
      </div>
    );
  }

  const needsCertificateHolderNotice = request.requested_documents.some(
    (doc) => documentMeta(doc.value).showCertificateHolderNotice
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload your documents</h1>
        <p className="text-gray-600">
          {request.provider_name}, we need current copies of the documents below.
          Accepted formats: PDF, JPG, PNG (max 10MB each).
        </p>
      </div>

      {request.note && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 whitespace-pre-wrap">{request.note}</p>
        </div>
      )}

      {needsCertificateHolderNotice && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium text-gray-900 mb-1">Certificate holder required</p>
              <p>
                Your General Liability certificate must list{' '}
                <strong>{INTEGRITY_CERTIFICATE_HOLDER.name}</strong> as certificate holder.
              </p>
              <p className="mt-2">
                {INTEGRITY_CERTIFICATE_HOLDER.addressLine1},{' '}
                {INTEGRITY_CERTIFICATE_HOLDER.cityStateZip}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {request.requested_documents.map((doc) => {
          const meta = documentMeta(doc.value);
          return (
            <div key={doc.value} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-1">
                {files[doc.value] ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                )}
                <h2 className="font-medium text-gray-900">{doc.label}</h2>
              </div>
              {meta.description && (
                <p className="text-sm text-gray-500 mb-3">{meta.description}</p>
              )}

              <FileUpload
                onFileSelect={(file) => handleFileSelect(doc.value, file)}
                onFileRemove={() => handleFileRemove(doc.value)}
                acceptedTypes={meta.acceptedFormats || '.jpg,.jpeg,.png,.pdf'}
                maxSizeMB={10}
                files={files[doc.value] ? [files[doc.value]] : []}
              />

              {errors[doc.value] && (
                <p className="text-sm text-red-600 mt-2">{errors[doc.value]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Uploading…' : 'Submit documents'}
        </Button>
      </div>
    </div>
  );
};

export default ProviderDocumentUpload;
