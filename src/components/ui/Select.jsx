import React from 'react';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  required = false,
  error = '',
  className = '',
  id,
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white transition-all ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[#E0DBD3] focus:border-[#1E3A5F]'
        } ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
