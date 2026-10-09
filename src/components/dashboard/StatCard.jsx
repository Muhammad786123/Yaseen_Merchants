import React from 'react';

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-[#1E3A5F]', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-none border-2 border-black p-3 shadow-none ${
        onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
            {label}
          </div>
          <div className={`text-xl font-black font-mono tracking-tight text-start ${color}`} dir="ltr">{value}</div>
          {sub && <div className="text-xs text-gray-600 mt-1 font-medium text-start">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-none border border-black bg-[#EBE9ED] flex items-center justify-center text-black shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
