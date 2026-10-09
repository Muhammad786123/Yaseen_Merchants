import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-4 border-b-2 border-black no-print">
      <div className="text-start">
        <h1 className="text-xl sm:text-2xl font-black text-[#1a6b2e] uppercase tracking-wider font-serif">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-700 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
