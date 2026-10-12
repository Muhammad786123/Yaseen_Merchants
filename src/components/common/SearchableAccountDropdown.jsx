import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export const TRADING_ACCOUNTS = [
  {
    id: '99010',
    code: '99010',
    name: 'Mall A/C - مال کھاتہ',
    head: 'Mall',
    accountType: 'mall',
  },
  {
    id: '99011',
    code: '99011',
    name: 'Sale A/C - سیل',
    head: 'Sale',
    accountType: 'mall',
  },
  {
    id: '99012',
    code: '99012',
    name: 'Purchase A/C - پرچیز',
    head: 'Purchase',
    accountType: 'mall',
  },
];

export default function SearchableAccountDropdown({
  value = '',
  accountType = '',
  accountNo = '',
  accountName = '',
  parties = [],
  bankAccounts = [],
  tradingAccounts = TRADING_ACCOUNTS,
  onSelect,
  placeholder = '-- Select Account --',
  compact = false,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const q = search.trim().toLowerCase();

  // Filter groups
  const filteredTrading = useMemo(() => {
    return tradingAccounts.filter((t) => {
      if (!q) return true;
      return (
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.head.toLowerCase().includes(q)
      );
    });
  }, [tradingAccounts, q]);

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (!q) return true;
      const code = String(p.code || p.id || '').toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const urdu = String(p.urduName || p.nameUrdu || '').toLowerCase();
      return code.includes(q) || name.includes(q) || urdu.includes(q);
    });
  }, [parties, q]);

  // Banks: filter out any physical cash accounts
  const filteredBanks = useMemo(() => {
    return bankAccounts
      .filter((b) => !b.name?.toLowerCase().includes('cash'))
      .filter((b) => {
        if (!q) return true;
        const code = String(b.code || b.id || '').toLowerCase();
        const name = String(b.name || '').toLowerCase();
        return code.includes(q) || name.includes(q);
      });
  }, [bankAccounts, q]);

  const hasAnyResults =
    filteredTrading.length > 0 || filteredParties.length > 0 || filteredBanks.length > 0;

  const handleSelectTrading = (t) => {
    onSelect?.({
      accountType: 'mall',
      accountId: t.id,
      accountNo: t.code,
      accountName: t.name,
      head: t.head,
    });
    setIsOpen(false);
    setSearch('');
  };

  const handleSelectParty = (p) => {
    onSelect?.({
      accountType: 'party',
      accountId: p.id,
      accountNo: p.code || p.id,
      accountName: p.name,
      head: null,
      balance: p.balance,
    });
    setIsOpen(false);
    setSearch('');
  };

  const handleSelectBank = (b) => {
    onSelect?.({
      accountType: 'bank',
      accountId: b.id,
      accountNo: b.code || b.id || 'BANK',
      accountName: b.name,
      head: null,
      balance: b.balance,
    });
    setIsOpen(false);
    setSearch('');
  };

  // Display label
  const displayLabel = useMemo(() => {
    if (accountType === 'mall') {
      const match = tradingAccounts.find((t) => t.id === value || t.code === accountNo || t.name === accountName);
      if (match) return compact ? match.code : `${match.code} - ${match.name}`;
      return compact ? (accountNo || '99010') : `${accountNo || '99010'} - ${accountName || 'Mall A/C'}`;
    }
    if (accountType === 'party') {
      const p = parties.find((party) => party.id === value || party.name === accountName);
      if (p) return compact ? (p.code || p.id) : `${p.code || p.id} - ${p.name}`;
      return compact ? (accountNo || '-') : (accountName ? `${accountNo ? accountNo + ' - ' : ''}${accountName}` : placeholder);
    }
    if (accountType === 'bank') {
      const b = bankAccounts.find((bank) => bank.id === value || bank.name === accountName);
      if (b) return compact ? (b.code || b.id) : `${b.code || b.id || 'BANK'} - ${b.name}`;
      return compact ? (accountNo || '-') : (accountName ? `${accountNo ? accountNo + ' - ' : ''}${accountName}` : placeholder);
    }
    if (accountNo) return compact ? accountNo : `${accountNo} - ${accountName}`;
    if (accountName) return accountName;
    return placeholder;
  }, [value, accountType, accountNo, accountName, compact, placeholder, tradingAccounts, parties, bankAccounts]);

  return (
    <div ref={containerRef} className={`relative ${compact ? 'w-full h-full' : 'w-full'} ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-start outline-none transition-colors cursor-pointer select-none ${
          compact
            ? 'px-2 py-2 text-base font-mono bg-transparent hover:bg-blue-50/50'
            : 'bg-white border border-black px-2 py-1 text-sm font-semibold hover:bg-gray-50'
        }`}
        title={displayLabel}
      >
        <span className={`truncate ${!accountName && !accountNo ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`shrink-0 ms-1 text-gray-500 transition-transform ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 sm:w-80 bg-white border-2 border-black shadow-2xl rounded-none py-1.5 start-0 text-xs">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-black bg-[#FAF9F7]">
            <div className="relative flex items-center">
              <Search className="absolute start-2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, party, bank, trading..."
                className="w-full bg-white border border-black ps-7 pe-7 py-1 text-xs outline-none focus:border-blue-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-2 text-gray-500 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {/* GROUP 1: Trading Accounts (تجارتی کھاتے) */}
            {filteredTrading.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 bg-[#E8F5E9] text-[#1B5E20] font-bold text-[11px] flex items-center justify-between uppercase tracking-wider sticky top-0 z-10 border-b border-green-200">
                  <span>Trading Accounts (تجارتی کھاتے)</span>
                  <span className="font-mono text-[10px] bg-white px-1 border border-green-300">Mall A/C</span>
                </div>
                {filteredTrading.map((t) => {
                  const isSelected = accountType === 'mall' && (value === t.id || accountNo === t.code);
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTrading(t)}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-green-50 transition-colors ${
                        isSelected ? 'bg-green-100 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#1B5E20] bg-green-50 border border-green-400 px-1.5 py-0.2">
                          {t.code}
                        </span>
                        <span className="text-gray-900 font-semibold">{t.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-green-700 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GROUP 2: Parties (کھاتے / پارٹیاں) */}
            {filteredParties.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 bg-[#E0E7FF] text-[#1E3A8A] font-bold text-[11px] flex items-center justify-between uppercase tracking-wider sticky top-0 z-10 border-b border-indigo-200">
                  <span>Parties (کھاتے / پارٹیاں)</span>
                  <span className="font-mono text-[10px] bg-white px-1 border border-indigo-300">{filteredParties.length}</span>
                </div>
                {filteredParties.map((p) => {
                  const isSelected = accountType === 'party' && (value === p.id || accountNo === (p.code || p.id));
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectParty(p)}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-colors ${
                        isSelected ? 'bg-indigo-100 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-xs text-indigo-900 bg-indigo-50 border border-indigo-300 px-1.5 py-0.2 shrink-0">
                          {p.code || p.id}
                        </span>
                        <span className="text-gray-900 truncate">{p.name}</span>
                        {p.city && <span className="text-[10px] text-gray-500">({p.city})</span>}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-700 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GROUP 3: Bank Accounts (بینک اکاؤنٹس) */}
            {filteredBanks.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 bg-[#FEF3C7] text-[#92400E] font-bold text-[11px] flex items-center justify-between uppercase tracking-wider sticky top-0 z-10 border-b border-amber-200">
                  <span>Bank Accounts (بینک اکاؤنٹس)</span>
                  <span className="font-mono text-[10px] bg-white px-1 border border-amber-300">{filteredBanks.length}</span>
                </div>
                {filteredBanks.map((b) => {
                  const isSelected = accountType === 'bank' && (value === b.id || accountNo === (b.code || b.id));
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBank(b)}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition-colors ${
                        isSelected ? 'bg-amber-100 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-xs text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.2 shrink-0">
                          {b.code || b.id || 'BANK'}
                        </span>
                        <span className="text-gray-900 truncate">{b.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {!hasAnyResults && (
              <div className="p-4 text-center text-gray-500">
                <span>No matching accounts found for "{search}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
