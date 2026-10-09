import React from 'react';
import Sidebar from './Sidebar.jsx';

export default function MobileSidebar({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden no-print">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-[#1E3A5F] shadow-2xl transform transition-transform duration-300">
        <Sidebar onClose={onClose} isMobile={true} />
      </div>
    </div>
  );
}
