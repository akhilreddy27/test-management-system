import React, { forwardRef } from 'react';

/**
 * Universal Input component that automatically handles Enter key navigation
 * Works with all input types: text, number, email, password, etc.
 */
const UniversalInput = forwardRef(({
  type = 'text',
  fieldName,
  onEnterComplete,
  shouldSubmit = false,
  className = '',
  ...props
}, ref) => {
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // Call completion callback if provided
      if (onEnterComplete) {
        onEnterComplete();
      }
      
      // Find the next input field to focus
      const currentInput = e.target;
      const form = currentInput.closest('form');
      
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea, button[type="button"]'));
        const currentIndex = inputs.indexOf(currentInput);
        
        if (currentIndex < inputs.length - 1) {
          // Focus next input
          const nextInput = inputs[currentIndex + 1];
          nextInput.focus();
        } else if (shouldSubmit) {
          // At last field, submit the form
          form.requestSubmit();
        }
      }
    }
    
    // Call original onKeyDown if provided
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <input
      ref={ref}
      type={type}
      onKeyDown={handleKeyDown}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
});

UniversalInput.displayName = 'UniversalInput';

export default UniversalInput;
