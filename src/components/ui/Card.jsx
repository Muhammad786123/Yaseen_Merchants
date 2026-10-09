import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-none border-2 border-black p-4 shadow-none ${
        onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
