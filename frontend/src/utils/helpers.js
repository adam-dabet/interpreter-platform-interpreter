export const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length >= 10) {
      return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    
    return value;
  };
  
  export const formatSSN = (value) => {
    // Only allow 4 digits
    return value.replace(/\D/g, '').slice(0, 4);
  };
  
  export const formatZipCode = (value) => {
    // Allow XXXXX or XXXXX-XXXX format
    const zip = value.replace(/\D/g, '');
    if (zip.length > 5) {
      return `${zip.slice(0, 5)}-${zip.slice(5, 9)}`;
    }
    return zip;
  };
  
  export const validateFileSize = (file, maxSizeMB = 10) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };
  
  export const validateFileType = (file, acceptedTypes) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    return acceptedTypes.includes(fileExtension);
  };
  
  export const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📎';
    }
  };
  
  export const calculateProgress = (currentStep, totalSteps) => {
    return Math.round((currentStep / totalSteps) * 100);
  };
  
  export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };