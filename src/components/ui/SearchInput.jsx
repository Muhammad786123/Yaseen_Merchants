import React from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) {
  return (
    <div className={`relative min-w-[200px] ${className}`}>
      <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
      <input
        type="text"
        dir="auto"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full ps-8 pe-3 py-1.5 text-xs bg-white border border-black rounded-none outline-none focus:border-blue-800 transition-colors text-black font-medium"
      />
    </div>
  );
}
