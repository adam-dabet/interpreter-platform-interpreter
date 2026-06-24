/**
 * Date utility functions to handle date formatting without timezone issues
 * 
 * The key issue: new Date("2025-11-08") interprets the date as midnight UTC,
 * which causes timezone conversion issues. For dates stored as YYYY-MM-DD,
 * we need to parse them as local dates.
 */

/**
 * Parse a date string (YYYY-MM-DD or ISO) as a local date, not UTC
 * This prevents timezone conversion issues
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  // Handle if already a Date object
  if (dateString instanceof Date) return dateString;
  
  // Convert to string and extract just the date part (YYYY-MM-DD)
  // This handles both "2025-11-08" and "2025-11-08T00:00:00.000Z" formats
  const dateStr = String(dateString).split('T')[0];
  
  // Split and validate
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const [year, month, day] = parts.map(Number);
  
  // Validate the numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  // Create date in local timezone
  return new Date(year, month - 1, day);
};

/**
 * Format a date string for display
 * @param {string} dateString - Date in YYYY-MM-DD format or ISO timestamp
 * @param {object} options - Intl.DateTimeFormat options
 */
export const formatDate = (dateString, options = {}) => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  try {
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'N/A';
  }
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
 * Format a time string for 12-hour display (e.g. "2:30 PM").
 * Accepts 24-hour ("14:30", "14:30:00"), 12-hour ("2:30 PM"),
 * and malformed values like "20:18 PM" from legacy submissions.
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';

  const str = String(timeString).trim();

  const amPmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const minute = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    if (hour > 12) {
      hour = hour % 12 || 12;
    }
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${period}`;
  }

  const parts = str.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutePart = parts[1].replace(/\D/g, '');
    const minutes = minutePart.padStart(2, '0').slice(0, 2);
    if (!Number.isNaN(hours)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHour}:${minutes} ${period}`;
    }
  }

  return str;
};

/** Format a date+time for display in 12-hour locale (e.g. "Jun 23, 2026, 3:12 PM"). */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
 * Build a Date object from a job's scheduled_date + scheduled_time.
 * Safely handles scheduled_date coming back as either "YYYY-MM-DD" or a
 * full ISO timestamp like "2026-04-24T00:00:00.000Z".
 * Returns null if the job has no valid scheduled date/time.
 */
export const getJobScheduledDateTime = (job) => {
  if (!job || !job.scheduled_date) return null;

  const date = parseLocalDate(job.scheduled_date);
  if (!date) return null;

  const timeString = job.scheduled_time || '00:00:00';
  const timeParts = String(timeString).split(':');
  const hours = parseInt(timeParts[0], 10) || 0;
  const minutes = parseInt(timeParts[1], 10) || 0;
  const seconds = parseInt(timeParts[2], 10) || 0;

  date.setHours(hours, minutes, seconds, 0);
  return date;
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

