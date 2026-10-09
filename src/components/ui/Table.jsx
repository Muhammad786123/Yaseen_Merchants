import React from 'react';

export function Table({ headers = [], children, emptyText = 'No records found' }) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <div className="overflow-x-auto border-2 border-black bg-white rounded-none shadow-none">
      <table className="w-full text-xs text-left border-collapse border border-black">
        <thead className="bg-[#DFDFDF] border-b-2 border-black">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className="border border-black px-3 py-2 text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">{children}</tbody>
      </table>
      {!hasRows && (
        <div className="text-center py-8 text-gray-500 font-medium text-xs border-t border-black bg-gray-50">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function TR({ children, onClick, highlight = false, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-black transition-colors ${
        onClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50'
      } ${highlight ? 'bg-amber-100/60 font-semibold' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, mono = false, right = false, className = '' }) {
  return (
    <td
      className={`border border-black px-3 py-1.5 text-gray-900 whitespace-nowrap text-xs ${
        mono ? 'font-mono' : ''
      } ${right ? 'text-right' : ''} ${className}`}
    >
      {children}
    </td>
  );
}
