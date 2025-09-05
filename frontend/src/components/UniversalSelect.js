import React, { forwardRef } from 'react';

/**
 * Universal Select component that automatically handles Enter key navigation
 * Works with all select elements
 */
const UniversalSelect = forwardRef(({
  onEnterComplete,
  shouldSubmit = false,
  className = '',
  children,
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
      const currentSelect = e.target;
      const form = currentSelect.closest('form');
      
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea, button[type="button"]'));
        const currentIndex = inputs.indexOf(currentSelect);
        
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
    <select
      ref={ref}
      onKeyDown={handleKeyDown}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

UniversalSelect.displayName = 'UniversalSelect';

export default UniversalSelect;
