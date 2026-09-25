import React from 'react';
import { Calendar } from 'lucide-react';

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
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white transition-all ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-[#E0DBD3] focus:border-[#1E3A5F]'
          }`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
