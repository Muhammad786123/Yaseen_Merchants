import React from 'react';

export default function Badge({ children, variant = 'blue', className = '' }) {
  const variants = {
    blue: 'bg-[#E3F2FD] text-[#0D47A1] border-black',
    green: 'bg-[#E8F5E9] text-[#1B5E20] border-black',
    orange: 'bg-[#FFF3E0] text-[#E65100] border-black',
    red: 'bg-[#FFEBEE] text-[#B71C1C] border-black',
    amber: 'bg-[#FFEB3B] text-black border-black font-extrabold',
    purple: 'bg-[#F3E5F5] text-[#4A148C] border-black',
    gray: 'bg-[#F5F5F5] text-black border-black',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-bold border ${
        variants[variant] || variants.blue
      } ${className}`}
    >
      {children}
    </span>
  );
}
