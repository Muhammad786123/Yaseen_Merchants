import React from 'react';

export default function Textarea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 3,
  required = false,
  error = '',
  className = '',
  id,
}) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white transition-all ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[#E0DBD3] focus:border-[#1E3A5F]'
        } ${className}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
