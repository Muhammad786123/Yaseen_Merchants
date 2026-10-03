import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { profile, defaultLogo } = useCompanyProfile();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const effectiveLogo = profile?.logoUrl || defaultLogo || logoImg;
  const legalName = profile?.legalName || 'Shahid Yaseen';
  const subText = profile?.address || profile?.tagline || 'Cotton Waste Merchant';

  return (
    <header className="bg-white border-b border-[#E0DBD3] sticky top-0 z-20 px-4 sm:px-6 py-2.5 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-[#F5F4F0] text-[#1E3A5F] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-6 w-px bg-[#E0DBD3] hidden sm:block"></div>

        <div className="flex items-center gap-2.5 pl-1">
          <div className="bg-[#FAF9F7] p-1 rounded-lg border border-[#E0DBD3] flex items-center justify-center">
            <img src={effectiveLogo} alt={legalName} className="h-7 w-auto object-contain" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#1E3A5F] leading-tight truncate max-w-[200px]" title={legalName}>
              {legalName}
            </div>
            <div className="text-[10px] text-gray-500 font-medium truncate max-w-[200px]" title={subText}>
              {subText}
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#E0DBD3]"></div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-red-200 cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}


