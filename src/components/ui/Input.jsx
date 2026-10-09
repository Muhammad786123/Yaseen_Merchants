import React from 'react';

export default function Input({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  required = false,
  readOnly = false,
  error = '',
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const isLtrType = type === 'number' || type === 'date' || type === 'datetime-local' || type === 'time' || type === 'tel';
  const effectiveDir = props.dir || (isLtrType ? 'ltr' : 'auto');
  const alignmentClass = isLtrType ? 'text-left font-mono' : 'text-start';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-gray-900 mb-1 text-start">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        dir={effectiveDir}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-2.5 py-1.5 text-xs border rounded-none outline-none transition-colors ${alignmentClass} ${
          error
            ? 'border-red-600 focus:border-red-700 bg-red-50/20'
            : 'border-black focus:border-blue-700 bg-white'
        } ${readOnly ? 'bg-gray-100 text-gray-700 cursor-not-allowed font-medium' : 'text-gray-900'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 font-semibold mt-0.5 text-start">{error}</p>}
    </div>
  );
}
