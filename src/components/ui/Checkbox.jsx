import React from 'react';

export default function Checkbox({ label, checked, onChange, id, className = '' }) {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label htmlFor={checkboxId} className={`inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer ${className}`}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        className="w-4 h-4 text-[#1E3A5F] border-[#E0DBD3] rounded focus:ring-[#1E3A5F]"
      />
      {label && <span>{label}</span>}
    </label>
  );
}
