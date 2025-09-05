import React from 'react';

// Toast duration constants
export const TOAST_DURATIONS = {
  SUCCESS: 4000,    // 4 seconds
  ERROR: 6000,      // 6 seconds
  WARNING: 5000,    // 5 seconds
  INFO: 4000,       // 4 seconds
  DEFAULT: 3000     // 3 seconds
};

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Centralized toast service for consistent message durations across the app
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} customDuration - Optional custom duration in milliseconds
 * @param {Function} setMessage - Function to set the message state
 */
export const showToast = (message, type = TOAST_TYPES.INFO, customDuration = null, setMessage) => {
  if (!setMessage) {
    console.warn('showToast: setMessage function is required');
    return;
  }

  // Determine duration based on type
  let duration;
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      duration = TOAST_DURATIONS.SUCCESS;
      break;
    case TOAST_TYPES.ERROR:
      duration = TOAST_DURATIONS.ERROR;
      break;
    case TOAST_TYPES.WARNING:
      duration = TOAST_DURATIONS.WARNING;
      break;
    case TOAST_TYPES.INFO:
      duration = TOAST_DURATIONS.INFO;
      break;
    default:
      duration = TOAST_DURATIONS.DEFAULT;
  }

  // Override with custom duration if provided
  if (customDuration !== null && customDuration > 0) {
    duration = customDuration;
  }

  // Set the message
  setMessage(message);
  
  // Auto-dismiss after duration
  setTimeout(() => {
    setMessage('');
  }, duration);
};

/**
 * Convenience functions for different toast types
 */
export const showSuccessToast = (message, setMessage, customDuration = null) => {
  showToast(message, TOAST_TYPES.SUCCESS, customDuration, setMessage);
};

export const showErrorToast = (message, setMessage, customDuration = null) => {
  showToast(message, TOAST_TYPES.ERROR, customDuration, setMessage);
};

export const showWarningToast = (message, setMessage, customDuration = null) => {
  showToast(message, TOAST_TYPES.WARNING, customDuration, setMessage);
};

export const showInfoToast = (message, setMessage, customDuration = null) => {
  showToast(message, TOAST_TYPES.INFO, customDuration, setMessage);
};

/**
 * Helper function for consistent field navigation across forms
 * @param {string} currentField - Current field name
 * @param {Array} fieldOrder - Array of field names in order
 * @param {Object} fieldRefs - Object containing refs for each field
 */
export const moveToNextField = (currentField, fieldOrder, fieldRefs) => {
  const currentIndex = fieldOrder.indexOf(currentField);
  
  if (currentIndex < fieldOrder.length - 1) {
    const nextField = fieldOrder[currentIndex + 1];
    const nextRef = fieldRefs[nextField];
    
    if (nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  }
};

export default {
  showToast,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  moveToNextField,
  TOAST_DURATIONS,
  TOAST_TYPES
};
