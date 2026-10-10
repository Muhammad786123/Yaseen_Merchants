import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CompanyLogo from '../common/CompanyLogo.jsx';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';
import {
  LayoutGrid,
  Users,
  Tag,
  Home,
  ArrowDownCircle,
  ArrowUpCircle,
  Share2,
  DollarSign,
  BookOpen,
  Package,
  BarChart2,
  Settings as SettingsIcon,
  MinusCircle,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/parties', label: 'Parties', icon: Users },
  { path: '/items', label: 'Items', icon: Tag },
  { path: '/warehouses', label: 'Warehouses', icon: Home },
  { path: '/purchase', label: 'Purchase', icon: ArrowDownCircle },
  { path: '/sale', label: 'Sale', icon: ArrowUpCircle },
  { path: '/issue', label: 'Issue', icon: Share2 },
  { path: '/cash-book', label: 'Cash Book', icon: DollarSign },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/stock', label: 'Stock', icon: Package },
  { path: '/reports', label: 'Reports', icon: BarChart2 },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
  // { path: '/expenses', label: 'Expenses', icon: MinusCircle },
];

export default function Sidebar({
  onClose,
  collapsed: externalCollapsed,
  onToggleCollapse,
  isMobile = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  const isCollapsed = !isMobile && (externalCollapsed !== undefined ? externalCollapsed : internalCollapsed);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    try {
      localStorage.setItem('sidebar_collapsed', String(next));
    } catch {
      // ignore
    }
    if (onToggleCollapse) onToggleCollapse(next);
  };

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
    if (onClose) onClose();
  };

  const isItemActive = (item) => {
    const currentPath = location.pathname;
    if (item.path === '/journal') {
      return currentPath === '/journal' || currentPath === '/party-ledger';
    }
    if (item.path === '/stock') {
      return currentPath === '/stock' || currentPath === '/stock-ledger';
    }
    if (item.path === '/cash-book') {
      return (
        currentPath === '/cash-book' ||
        currentPath === '/cash-bank' ||
        currentPath === '/receipt' ||
        currentPath === '/payment'
      );
    }
    if (item.path === '/reports') {
      return currentPath === '/reports';
    }
    return currentPath === item.path;
  };

  return (
    <div
      className={`h-full bg-[#1E3A5F] flex flex-col border-e border-[#1E3A5F] no-print transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-60'
        }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center border-b border-white/10 sticky top-0 bg-[#1E3A5F] z-10 ${isCollapsed ? 'justify-center px-2 py-3.5' : 'justify-between px-3.5 py-3.5'
          }`}
      >
        <div
          className="cursor-pointer"
          onClick={() => handleNav('/dashboard')}
          title={legalName}
        >
          <CompanyLogo
            variant="onDark"
            size="sm"
            showTagline={!isCollapsed}
          />
        </div>
        {!isCollapsed && onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Brand Accent Bar (Green -> Teal -> Blue gradient line) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#00D084] via-[#00D0B6] to-[#00A3FF]"></div>

      {/* Navigation items - Single flat list, no group headings */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-base font-medium transition-all relative cursor-pointer ${isCollapsed
                  ? 'justify-center py-3 px-2'
                  : 'gap-3 px-3.5 py-3 text-start'
                } ${active
                  ? 'bg-[#C97B2E] text-white shadow-xs font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
            >
              {active && (
                <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-e bg-gradient-to-b from-[#00D084] via-[#00D0B6] to-[#00A3FF]"></span>
              )}
              <ItemIcon className="w-4.5 h-4.5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer with Collapse toggle and Logout */}
      <div
        className={`border-t border-white/10 bg-[#1E3A5F] sticky bottom-0 space-y-2 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'
          }`}
      >
        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex items-center rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer ${isCollapsed
                ? 'w-full justify-center py-2.5'
                : 'w-full gap-2.5 px-3 py-2.5'
              }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Collapse</span>
              </>
            )}
          </button>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600 transition-all border border-red-500/20 cursor-pointer ${isCollapsed
              ? 'justify-center py-2.5'
              : 'justify-center gap-2 px-3 py-2'
            }`}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {!isCollapsed && (
          <div className="text-center pt-0.5">
            <div className="text-xs text-white/50 font-semibold truncate" title={legalName}>
              {legalName}
            </div>
            <div className="text-xs text-white/35 mt-0.5">SYCWM ERP v1.0</div>
          </div>
        )}
      </div>
    </div>
  );
}
