import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl border border-[#E0DBD3]">
      <div className="w-12 h-12 rounded-full bg-[#F5F4F0] flex items-center justify-center text-[#1E3A5F] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-[#1E3A5F] mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
