import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CompanyLogo from '../common/CompanyLogo.jsx';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';
import {
  LayoutGrid,
  Users,
  Tag,
  Star,
  Home,
  ArrowDownCircle,
  Share2,
  Settings,
  ArrowUpCircle,
  CheckCircle,
  CreditCard,
  Package,
  BookOpen,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  BarChart2,
  Activity,
  Hash,
  User,
  X,
  LogOut,
} from 'lucide-react';

const navGroups = [
  {
    label: null,
    items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutGrid }],
  },
  {
    label: 'Masters',
    items: [
      { path: '/parties', label: 'Parties', icon: Users },
      { path: '/items', label: 'Items', icon: Tag },
      { path: '/qualities', label: 'Qualities', icon: Star },
      { path: '/warehouses', label: 'Warehouses', icon: Home },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { path: '/purchase', label: 'Purchase', icon: ArrowDownCircle },
      { path: '/issue', label: 'Issue', icon: Share2 },
      { path: '/production', label: 'Production', icon: Settings },
      { path: '/sale', label: 'Sale', icon: ArrowUpCircle },
      { path: '/receipt', label: 'Receipt', icon: CheckCircle },
      { path: '/payment', label: 'Payment', icon: CreditCard },
    ],
  },
  {
    label: 'Stock',
    items: [
      { path: '/stock', label: 'Stock', icon: Package },
      { path: '/stock-ledger', label: 'Stock Ledger', icon: BookOpen },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { path: '/cash-book', label: 'Cash Book', icon: DollarSign },
      { path: '/party-ledger', label: 'Party Ledger', icon: FileText },
      { path: '/sale-purchase-ledger', label: 'Sale Purchase A/C (Mall A/C)', icon: BarChart2 },
      { path: '/cash-bank', label: 'Cash / Bank', icon: Home },
      { path: '/receivable', label: 'Receivable', icon: TrendingUp },
      { path: '/payable', label: 'Payable', icon: TrendingDown },
      { path: '/expenses', label: 'Expenses', icon: MinusCircle },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/reports?tab=purchase', label: 'Purchase Report', icon: BarChart2 },
      { path: '/reports?tab=sale', label: 'Sale Report', icon: BarChart2 },
      { path: '/reports?tab=stock', label: 'Stock Report', icon: BarChart2 },
      { path: '/reports?tab=production', label: 'Production Report', icon: BarChart2 },
      { path: '/reports?tab=pl', label: 'Profit & Loss', icon: Activity },
    ],
  },
  {
    label: 'Settings',
    items: [
      { path: '/settings?tab=numbering', label: 'Numbering', icon: Hash },
      { path: '/settings?tab=users', label: 'Users', icon: User },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <div className="w-60 h-full bg-[#1E3A5F] flex flex-col overflow-y-auto border-r border-[#1E3A5F] no-print">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-white/10 sticky top-0 bg-[#1E3A5F] z-10">
        <div className="cursor-pointer" onClick={() => handleNav('/dashboard')} title={legalName}>
          <CompanyLogo variant="onDark" size="sm" showTagline={true} />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Brand Accent Bar (Green -> Teal -> Blue gradient dots line) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#00D084] via-[#00D0B6] to-[#00A3FF]"></div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const basePath = item.path.split('?')[0];
                const active =
                  location.pathname === basePath &&
                  (!item.path.includes('?') ||
                    location.search === '?' + item.path.split('?')[1]);

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all relative ${
                      active
                        ? 'bg-[#C97B2E] text-white shadow-xs font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-gradient-to-b from-[#00D084] via-[#00D0B6] to-[#00A3FF]"></span>
                    )}
                    <ItemIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with Logout */}
      <div className="px-3 py-3 border-t border-white/10 bg-[#1E3A5F] sticky bottom-0 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600 transition-all border border-red-500/20 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>

        <div className="text-center">
          <div className="text-[10px] text-white/40 font-semibold truncate" title={legalName}>
            {legalName}
          </div>
          <div className="text-[9px] text-white/25 mt-0.5">SYCWM ERP v1.0</div>
        </div>
      </div>
    </div>
  );
}

