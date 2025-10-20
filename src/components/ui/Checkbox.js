import React, { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  description,
  error,
  required = false,
  className = '',
  checked,
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
            className={`
              h-4 w-4 rounded border-gray-300 text-blue-600 
              focus:ring-blue-500 focus:ring-2 focus:ring-offset-2
              transition-colors duration-200
              ${error ? 'border-red-300' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
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