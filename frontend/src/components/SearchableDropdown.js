import React, { useState, useRef, useEffect, forwardRef } from 'react';

const SearchableDropdown = forwardRef(function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  onAddNew,
  allowAddNew = true,
  className = '',
  onKeyDown,
  onEnterComplete
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);
    setSelectedIndex(-1); // Reset selection when search changes
    if (searchValue.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  };

  const handleSelect = (selectedValue, fromEnterKey = false) => {
    onChange(selectedValue);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1); // Reset selection after selecting
    
    // If Enter key was used, call onEnterComplete for field navigation
    if (fromEnterKey && onEnterComplete) {
      onEnterComplete();
    }
  };

  const handleAddNew = () => {
    if (searchTerm.trim() && allowAddNew && !options.includes(searchTerm.trim())) {
      onAddNew(searchTerm.trim());
      onChange(searchTerm.trim());
      setSearchTerm('');
      setIsOpen(false);
      
      // Call onEnterComplete for field navigation when adding new option
      if (onEnterComplete) {
        onEnterComplete();
      }
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    handleSearch(newValue);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFilteredOptions(options);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        // If an option is selected, choose it
        handleSelect(filteredOptions[selectedIndex], true);
        return; // Exit early to prevent any further processing
      } else if (searchTerm.trim()) {
        if (filteredOptions.includes(searchTerm.trim())) {
          // If exact match exists, select it
          handleSelect(searchTerm.trim(), true);
          return; // Exit early to prevent any further processing
        } else if (allowAddNew) {
          // If no exact match and adding is allowed, add new option
          handleAddNew();
          return; // Exit early to prevent any further processing
        }
      }
      
      // Don't call parent's onKeyDown for Enter key to prevent form submission
      // Only call it for other keys that might be needed for field navigation
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        ref={ref}
        type="text"
        value={searchTerm || value}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500">
              No options found
              {allowAddNew && searchTerm.trim() && (
                <div className="mt-1 text-sm text-gray-400">
                  Press Enter to add "{searchTerm.trim()}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SearchableDropdown;
