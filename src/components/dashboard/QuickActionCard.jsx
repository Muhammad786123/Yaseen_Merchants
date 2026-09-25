import React from 'react';
import Card from '../ui/Card.jsx';

export default function QuickActionCard({ title, description, icon: Icon, onClick }) {
  return (
    <Card
      onClick={onClick}
      className="flex items-center gap-4 hover:border-[#C97B2E] transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/5 text-[#1E3A5F] group-hover:bg-[#C97B2E] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-[#1E3A5F] group-hover:text-[#C97B2E] transition-colors">
          {title}
        </h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </Card>
  );
}
