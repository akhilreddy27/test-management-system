import { useCallback } from 'react';

/**
 * Universal hook for consistent field navigation across all components
 * Provides Enter key handling and field transition logic
 */
export const useFieldNavigation = (fieldOrder, fieldRefs) => {
  
  /**
   * Move focus to the next field in the sequence
   * @param {string} currentField - Current field name
   * @param {boolean} shouldSubmit - Whether to submit form if at last field
   */
  const moveToNextField = useCallback((currentField, shouldSubmit = false) => {
    const currentIndex = fieldOrder.indexOf(currentField);
    
    if (currentIndex < fieldOrder.length - 1) {
      // Move to next field
      const nextField = fieldOrder[currentIndex + 1];
      const nextRef = fieldRefs[nextField];
      
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    } else if (shouldSubmit) {
      // At last field, submit the form
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }
  }, [fieldOrder, fieldRefs]);

  /**
   * Handle Enter key press for any field
   * @param {Event} e - Keyboard event
   * @param {string} fieldName - Current field name
   * @param {Function} onComplete - Optional callback when field is complete
   * @param {boolean} shouldSubmit - Whether to submit form if at last field
   */
  const handleEnterKey = useCallback((e, fieldName, onComplete = null, shouldSubmit = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
      
      // Move to next field
      moveToNextField(fieldName, shouldSubmit);
    }
  }, [moveToNextField]);

  /**
   * Create a universal onKeyDown handler for any field
   * @param {string} fieldName - Current field name
   * @param {Function} onComplete - Optional callback when field is complete
   * @param {boolean} shouldSubmit - Whether to submit form if at last field
   */
  const createFieldHandler = useCallback((fieldName, onComplete = null, shouldSubmit = false) => {
    return (e) => handleEnterKey(e, fieldName, onComplete, shouldSubmit);
  }, [handleEnterKey]);

  return {
    moveToNextField,
    handleEnterKey,
    createFieldHandler
  };
};

export default useFieldNavigation;
