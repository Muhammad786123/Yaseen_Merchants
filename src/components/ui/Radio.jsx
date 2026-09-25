import React from 'react';

export default function Radio({ label, name, value, checked, onChange, id, className = '' }) {
  const radioId = id || `${name}-${value}`;

  return (
    <label htmlFor={radioId} className={`inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer ${className}`}>
      <input
        id={radioId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-4 h-4 text-[#1E3A5F] border-[#E0DBD3] focus:ring-[#1E3A5F]"
      />
      {label && <span>{label}</span>}
    </label>
  );
}
