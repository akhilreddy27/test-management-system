import React, { forwardRef } from 'react';

/**
 * Universal Textarea component that automatically handles Enter key navigation
 * Note: Enter key in textarea creates new lines, Ctrl+Enter moves to next field
 */
const UniversalTextarea = forwardRef(({
  onEnterComplete,
  shouldSubmit = false,
  className = '',
  ...props
}, ref) => {
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      // Call completion callback if provided
      if (onEnterComplete) {
        onEnterComplete();
      }
      
      // Find the next input field to focus
      const currentTextarea = e.target;
      const form = currentTextarea.closest('form');
      
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea, button[type="button"]'));
        const currentIndex = inputs.indexOf(currentTextarea);
        
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
    <textarea
      ref={ref}
      onKeyDown={handleKeyDown}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
});

UniversalTextarea.displayName = 'UniversalTextarea';

export default UniversalTextarea;
