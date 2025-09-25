import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { validateFileSize, validateFileType, getFileIcon } from '../../utils/helpers';

const FileUpload = ({
  onFileSelect,
  onFileRemove,
  acceptedTypes = '.jpg,.jpeg,.png,.pdf',
  maxSizeMB = 10,
  multiple = false,
  label,
  helper,
  error,
  files = [],
  required = false
}) => {
  const [dragError, setDragError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragError('');
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setDragError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        setDragError(`Invalid file type. Accepted types: ${acceptedTypes}`);
      } else {
        setDragError('File upload failed. Please try again.');
      }
      return;
    }

    acceptedFiles.forEach(file => {
      if (!validateFileSize(file, maxSizeMB)) {
        setDragError(`File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      const acceptedTypesArray = acceptedTypes.split(',');
      if (!validateFileType(file, acceptedTypesArray)) {
        setDragError(`File type not supported. Accepted types: ${acceptedTypes}`);
        return;
      }

      onFileSelect(file);
    });
  }, [onFileSelect, maxSizeMB, acceptedTypes]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.split(',').reduce((acc, type) => {
      acc[`application/${type.replace('.', '')}`] = [];
      acc[`image/${type.replace('.', '')}`] = [];
      return acc;
    }, {}),
    maxSize: maxSizeMB * 1024 * 1024,
    multiple
  });

  const removeFile = (index) => {
    onFileRemove(index);
    setDragError('');
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive && !isDragReject 
            ? 'border-blue-400 bg-blue-50' 
            : isDragReject || error || dragError
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">
            {isDragActive 
              ? 'Drop files here...' 
              : 'Click to upload or drag and drop'
            }
          </p>
          <p className="text-xs text-gray-500">
            {acceptedTypes.toUpperCase()} up to {maxSizeMB}MB
          </p>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mt-3"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Messages */}
      {(error || dragError) && (
        <p className="text-sm text-red-600">{error || dragError}</p>
      )}
      
      {/* Helper Text */}
      {helper && !error && !dragError && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
};

export default FileUpload;