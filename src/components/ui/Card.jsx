import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E0DBD3] p-5 shadow-xs ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-[#C97B2E]/40 transition-all' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
