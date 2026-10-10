import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  title,
  children,
  isOpen = true,
  onClose,
  maxWidth = 'max-w-lg',
  isPrintPreview = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLargePreview = isPrintPreview || maxWidth?.includes('96vw');

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="fixed inset-0 bg-black/60 transition-opacity no-print"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Dialog with Classic Bordered Box Styling */}
      <div
        className={`modal-dialog relative bg-white rounded-none border-2 border-black shadow-2xl ${
          isLargePreview
            ? 'w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh]'
            : `w-full ${maxWidth} max-h-[96vh]`
        } flex flex-col overflow-hidden z-10 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#EBE9ED] border-b-2 border-black sticky top-0 z-10 no-print flex-shrink-0">
          <h2 className="text-xs font-black text-black uppercase tracking-wider font-sans">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 border border-black bg-white hover:bg-red-100 text-black hover:text-red-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className={`modal-content ${isLargePreview ? 'p-1 sm:p-3' : 'p-3 sm:p-4'} overflow-y-auto flex-1 font-sans text-start flex flex-col min-h-0`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
