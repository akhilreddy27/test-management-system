import React from 'react';

/**
 * Higher-Order Component that automatically adds Enter key navigation
 * to any existing component without modifying its original code
 * 
 * @param {React.Component} WrappedComponent - The component to enhance
 * @param {Object} options - Configuration options
 * @returns {React.Component} Enhanced component with Enter key navigation
 */
export const withEnterNavigation = (WrappedComponent, options = {}) => {
  const {
    shouldSubmit = false,
    onEnterComplete = null,
    focusSelector = null
  } = options;

  const EnhancedComponent = React.forwardRef((props, ref) => {
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Call completion callback if provided
        if (onEnterComplete) {
          onEnterComplete();
        }
        
        // Find the next focusable element
        let nextElement = null;
        
        if (focusSelector) {
          // Use custom selector if provided
          nextElement = document.querySelector(focusSelector);
        } else {
          // Auto-detect next input
          const currentElement = e.target;
          const form = currentElement.closest('form');
          
          if (form) {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea, button[type="button"]'));
            const currentIndex = inputs.indexOf(currentElement);
            
            if (currentIndex < inputs.length - 1) {
              nextElement = inputs[currentIndex + 1];
            } else if (shouldSubmit) {
              // At last field, submit the form
              form.requestSubmit();
              return;
            }
          }
        }
        
        // Focus next element
        if (nextElement) {
          nextElement.focus();
        }
      }
      
      // Call original onKeyDown if provided
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    // Merge the enhanced onKeyDown with existing props
    const enhancedProps = {
      ...props,
      onKeyDown: handleKeyDown
    };

    return <WrappedComponent ref={ref} {...enhancedProps} />;
  });

  EnhancedComponent.displayName = `withEnterNavigation(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return EnhancedComponent;
};

export default withEnterNavigation;
