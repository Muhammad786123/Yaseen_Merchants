import React from 'react';
import Card from '../ui/Card.jsx';

export default function StatCard({ label, value, sub, icon: Icon, color = 'text-[#1E3A5F]', onClick }) {
  return (
    <Card onClick={onClick} className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {label}
          </div>
          <div className={`text-xl font-bold ${color}`}>{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[#F5F4F0] flex items-center justify-center text-[#1E3A5F] shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
