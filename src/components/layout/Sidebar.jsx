import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <div className="w-56 h-full bg-[#1E3A5F] flex flex-col overflow-y-auto border-r border-[#1E3A5F]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 sticky top-0 bg-[#1E3A5F] z-10">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNav('/dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-[#C97B2E] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-white text-sm font-bold">Y</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-tight">
              Yaseen Merchants
            </div>
            <div className="text-white/50 text-[10px]">Cotton Waste Merchant</div>
          </div>
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                      active
                        ? 'bg-[#C97B2E] text-white shadow-xs font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <ItemIcon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 text-center bg-[#1E3A5F] sticky bottom-0">
        <div className="text-[10px] text-white/30 font-medium">
          Yaseen Merchants ERP v1.0
        </div>
      </div>
    </div>
  );
}
