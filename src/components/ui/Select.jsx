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
        <label htmlFor={selectId} className="block text-xs font-bold text-gray-900 mb-1 text-start">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`w-full px-2 py-1.5 text-xs text-start border rounded-none outline-none bg-white transition-colors text-gray-900 ${
          error
            ? 'border-red-600 focus:border-red-700 bg-red-50/20'
            : 'border-black focus:border-blue-700'
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
      {error && <p className="text-xs text-red-600 font-semibold mt-0.5 text-start">{error}</p>}
    </div>
  );
}
