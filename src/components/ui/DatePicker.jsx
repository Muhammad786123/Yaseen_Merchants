import React from 'react';

export default function DatePicker({
  label,
  value,
  onChange,
  required = false,
  error = '',
  className = '',
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-gray-900 mb-1 text-start">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <div>
        <input
          type="date"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-2 py-1.5 text-xs font-mono text-left border rounded-none outline-none bg-white transition-colors text-gray-900 ${
            error
              ? 'border-red-600 focus:border-red-700 bg-red-50/20'
              : 'border-black focus:border-blue-700'
          }`}
        />
      </div>
      {error && <p className="text-xs text-red-600 font-semibold mt-0.5 text-start">{error}</p>}
    </div>
  );
}
