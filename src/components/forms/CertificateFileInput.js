import React, { useRef } from 'react';
import { CameraIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function validateCertificateFile(file) {
  if (!file) return false;
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Only PDF, JPG, and PNG files are allowed');
    return false;
  }
  if (file.size > MAX_SIZE_BYTES) {
    toast.error('File size must be less than 10MB');
    return false;
  }
  return true;
}

const CertificateFileInput = ({ onFileSelect, disabled = false }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = (file) => {
    if (!validateCertificateFile(file)) return;
    onFileSelect(file);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <CloudArrowUpIcon className="h-5 w-5" />
          Upload file
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <CameraIcon className="h-5 w-5" />
          Take photo
        </button>
      </div>
      <p className="text-xs text-gray-500">
        PDF, JPG, or PNG up to 10MB. On mobile, &quot;Take photo&quot; opens your camera.
      </p>
    </div>
  );
};

export default CertificateFileInput;
