import React from 'react';

export function Table({ headers = [], children, emptyText = 'No records found' }) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E0DBD3] bg-white">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-[#F5F4F0] border-b border-[#E0DBD3]">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0EDE8]">{children}</tbody>
      </table>
      {!hasRows && (
        <div className="text-center py-12 text-gray-400 text-sm">{emptyText}</div>
      )}
    </div>
  );
}

export function TR({ children, onClick, highlight = false, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors ${
        onClick ? 'cursor-pointer hover:bg-[#F9F8F6]' : 'hover:bg-[#FAF9F7]'
      } ${highlight ? 'bg-amber-50/60' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, mono = false, right = false, className = '' }) {
  return (
    <td
      className={`px-4 py-3 text-gray-700 whitespace-nowrap ${
        mono ? 'font-mono text-xs' : ''
      } ${right ? 'text-right' : ''} ${className}`}
    >
      {children}
    </td>
  );
}
