import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  label = '',
  error = '',
  required = false,
  getOptionLabel = (option) => option.label || option.name || String(option),
  getOptionValue = (option) => option.value || option.id || option,
  onSearchChange = null, // Callback: (searchTerm, hasResults) => void
  onNoResults = null, // Callback: (searchTerm) => void - called when search has no results
  noResultsAction = null // React node to render when no results found (e.g., a button)
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  // Notify parent of search state changes
  useEffect(() => {
    if (onSearchChange && isOpen) {
      const hasResults = filteredOptions.length > 0;
      onSearchChange(searchTerm, hasResults);
    } else if (onSearchChange && !isOpen) {
      // Reset when dropdown closes
      onSearchChange('', true);
    }
  }, [searchTerm, filteredOptions.length, isOpen, onSearchChange]);

  // Notify parent when no results found
  useEffect(() => {
    if (onNoResults && isOpen && searchTerm && filteredOptions.length === 0) {
      onNoResults(searchTerm);
    }
  }, [searchTerm, filteredOptions.length, isOpen, onNoResults]);

  // Get selected option label
  const selectedOption = options.find(opt => {
    const optValue = getOptionValue(opt);
    const val = value;
    // Handle both string and number comparisons, and empty/null values
    if (!val || val === '') return false;
    return String(optValue) === String(val);
  });
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : placeholder;
  
  // Close dropdown when value changes externally (e.g., when a new option is selected programmatically)
  useEffect(() => {
    if (value && selectedOption && isOpen) {
      // If we have a value and it matches an option, we can optionally close the dropdown
      // But let's keep it open for now to show the selection
    }
  }, [value, selectedOption, isOpen]);

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    // Call onChange with the value directly (not as an event object)
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchTerm('');
      }
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        {/* Selected Value Display */}
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={`w-full px-4 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between transition-colors duration-200 ${
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          } ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'
          }`}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {selectedLabel}
          </span>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">No options found</span>
                    {noResultsAction && searchTerm && (
                      <div className="ml-3">
                        {noResultsAction}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const optionLabel = getOptionLabel(option);
                  const isSelected = value && String(optionValue) === String(value);

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                        isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                      }`}
                    >
                      {optionLabel}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;

