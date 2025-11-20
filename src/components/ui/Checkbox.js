import React, { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  description,
  error,
  required = false,
  className = '',
  checked,
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className="space-y-1">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className={`
              h-4 w-4 rounded border-gray-300 text-blue-600 
              focus:ring-blue-500 focus:ring-2 focus:ring-offset-2
              transition-colors duration-200
              ${error ? 'border-red-300' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        
        <div className="ml-3">
          <label className={`text-sm font-medium ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && (
            <p className={`text-sm mt-1 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 ml-7">{error}</p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;