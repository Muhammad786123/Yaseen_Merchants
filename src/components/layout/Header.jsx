import React from 'react';
import { Menu, Bell, User, Search } from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  return (
    <header className="bg-white border-b border-[#E0DBD3] sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-[#F5F4F0] text-[#1E3A5F] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#1E3A5F] bg-[#F5F4F0] px-3 py-1.5 rounded-lg border border-[#E0DBD3]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Offline DB Connected (Dexie IndexedDB)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-[#F5F4F0] text-gray-500 hover:text-[#1E3A5F] relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500"></span>
        </button>
        <div className="h-6 w-px bg-[#E0DBD3] hidden sm:block"></div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            SY
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-[#1E3A5F] leading-tight">
              Shahid Yaseen
            </div>
            <div className="text-[10px] text-gray-500">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
