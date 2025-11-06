/**
 * Date utility functions to handle date formatting without timezone issues
 * 
 * The key issue: new Date("2025-11-08") interprets the date as midnight UTC,
 * which causes timezone conversion issues. For dates stored as YYYY-MM-DD,
 * we need to parse them as local dates.
 */

/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents timezone conversion issues
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  // Split the date string and create a date in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format a date string for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {object} options - Intl.DateTimeFormat options
 */
export const formatDate = (dateString, options = {}) => {
  const date = parseLocalDate(dateString);
  if (!date) return 'N/A';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format a date string for display (short version)
 */
export const formatDateShort = (dateString) => {
  return formatDate(dateString, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a time string for display
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  
  // Handle both HH:MM and HH:MM:SS formats
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHour}:${minutes} ${period}`;
};

/**
 * Check if a date string is today
 */
export const isToday = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date string is tomorrow
 */
export const isTomorrow = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Get time until a job
 */
export const getTimeUntilJob = (dateString, timeString) => {
  const date = parseLocalDate(dateString);
  if (!date || !timeString) return null;
  
  // Parse time
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  // Set time on the date
  date.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const msUntil = date - now;
  
  if (msUntil < 0) return null;
  
  const hoursUntil = msUntil / (1000 * 60 * 60);
  
  if (hoursUntil < 1) {
    const minutesUntil = Math.round(hoursUntil * 60);
    return `in ${minutesUntil} ${minutesUntil === 1 ? 'minute' : 'minutes'}`;
  }
  
  if (hoursUntil < 24) {
    return `in ${Math.round(hoursUntil)} ${Math.round(hoursUntil) === 1 ? 'hour' : 'hours'}`;
  }
  
  const daysUntil = Math.floor(hoursUntil / 24);
  return `in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`;
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

