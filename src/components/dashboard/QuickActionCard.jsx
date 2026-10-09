import React from 'react';

export default function QuickActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-none border-2 border-black p-3.5 shadow-none flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors group"
    >
      <div className="w-10 h-10 rounded-none border border-black bg-[#EBE9ED] text-black group-hover:bg-[#1a6b2e] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-black uppercase tracking-wide group-hover:text-[#1a6b2e] transition-colors">
          {title}
        </h4>
        <p className="text-[11px] text-gray-600 mt-0.5 font-medium">{description}</p>
      </div>
    </div>
  );
}
