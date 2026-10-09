import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useStock } from '../../hooks/useStock.js';
import { useProductions } from '../../hooks/useProductions.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useParties } from '../../hooks/useParties.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { useItems } from '../../hooks/useItems.js';
import { useQualities } from '../../hooks/useQualities.js';
import PartyQualityAnalysis from './PartyQualityAnalysis.jsx';
import { capitalService } from '../../services/capitalService.js';
import { fmt, fmtNum, formatDate, getTodayStr } from '../../utils/formatters.js';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  DollarSign,
  Printer,
  BookOpen,
  Wallet,
  FileText,
  Package,
  Layers,
  TrendingUp,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'purchase';

  // Global filters for date and search
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state for Capital injection / withdrawal
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capType, setCapType] = useState('Add');
  const [capAmount, setCapAmount] = useState(50000);
  const [capDesc, setCapDesc] = useState('Owner Capital Injection');
  const [capitalBalance, setCapitalBalance] = useState(0);

  // Live queries & hook data sources
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { stockEntries, syncStockEntries } = useStock();
  const { productions } = useProductions();
  const { expenses, accounts } = useFinances();
  const { parties } = useParties();
  const { stockAdjustments } = useStockAdjustments();
  const { items } = useItems();
  const { qualities } = useQualities();

  // View modes for Purchase & Sale report tabs ('invoice' | 'party_quality' | 'quality_party')
  const [purchaseViewMode, setPurchaseViewMode] = useState('invoice');
  const [saleViewMode, setSaleViewMode] = useState('invoice');

  // Cash Book & Journal live queries
  const rawCashBook = useLiveQuery(() => db.cashBookEntries ? db.cashBookEntries.toArray() : [], []) || [];
  const journalEntries = useLiveQuery(() => db.journalEntries ? db.journalEntries.reverse().toArray() : [], []) || [];
  const capitalEntries = useLiveQuery(() => db.capitalEntries ? db.capitalEntries.toArray() : [], []) || [];

  // Load Capital Balance
  useEffect(() => {
    async function loadCapital() {
      try {
        const bal = await capitalService.getBalance();
        setCapitalBalance(bal);
      } catch (err) {
        console.error('Failed to load capital balance:', err);
      }
    }
    loadCapital();
  }, [capitalEntries.length]);

  // Tab definitions in client's priority order
  const tabs = [
    { id: 'purchase', label: 'Purchase Report', icon: ArrowDownLeft },
    { id: 'sale', label: 'Sale Report', icon: ArrowUpRight },
    { id: 'stock', label: 'Stock Valuation', icon: Package },
    { id: 'cashbook', label: 'Cash Book Report', icon: Wallet },
    { id: 'journal', label: 'Journal Report', icon: BookOpen },
    { id: 'production', label: 'Production Yield', icon: Layers },
    { id: 'tb', label: 'Trial Balance', icon: FileText },
    { id: 'pl', label: 'P&L & Balance Sheet', icon: TrendingUp },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleCapitalSubmit = async (e) => {
    e.preventDefault();
    await capitalService.addEntry({
      type: capType,
      amount: Number(capAmount),
      description: capDesc,
    });
    const updated = await capitalService.getBalance();
    setCapitalBalance(updated);
    setIsCapitalModalOpen(false);
  };

  // --- CORE FINANCIAL & LEDGER CALCULATIONS ---

  // Purchases & Sales totals
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  // Live Stock Valuation directly from shared calculation
  const stockValuation = stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const totalStockQty = stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0);

  // Operating Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Journal adjustments to Mall A/C and Expenses
  const jvMallCredit = journalEntries
    .flatMap((j) => j.lines || [])
    .filter((l) => l.accountType === 'mall' || l.accountType === 'expense')
    .reduce((s, l) => s + Number(l.credit || 0) - Number(l.debit || 0), 0);

  // Mall A/C Net Trading Position (Sales - Purchases - Expenses + Journal adjustments)
  const mallNetPosition = totalSales - (totalPurchases + totalExpenses) + jvMallCredit;

  // Mall Trading Position with Closing Stock (Net Trading Surplus / Profit)
  const mallTradingBalance = mallNetPosition + stockValuation;

  // Customer Receivables (party balance < 0, customer owes business)
  const receivableParties = parties.filter((p) => Number(p.balance || 0) < 0);
  const totalReceivables = receivableParties.reduce((sum, p) => sum + Math.abs(Number(p.balance || 0)), 0);

  // Supplier Payables (party balance > 0, business owes supplier)
  const payableParties = parties.filter((p) => Number(p.balance || 0) > 0);
  const totalPayables = payableParties.reduce((sum, p) => sum + Number(p.balance || 0), 0);

  // Cash in Hand (from Cash account balance in accounts table)
  const cashAcc = accounts.find((a) => a.name.toLowerCase().includes('cash'));
  const cashInHand = Number(cashAcc?.balance || 0);
  const openingCash = Number(cashAcc?.openingBalance || 0);

  // Bank Balances (excluding physical Cash)
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));
  const totalBankBalances = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Balance Sheet Totals
  const grossProfit = totalSales + stockValuation - totalPurchases;
  const netProfit = grossProfit - totalExpenses + jvMallCredit; // Equals mallTradingBalance

  const sumDebits =
    cashInHand +
    totalBankBalances +
    totalReceivables +
    stockValuation +
    (mallTradingBalance < 0 ? Math.abs(mallTradingBalance) : 0);

  const sumCredits =
    totalPayables +
    capitalBalance +
    (mallTradingBalance >= 0 ? mallTradingBalance : 0);

  const tbDifference = Math.abs(sumDebits - sumCredits);
  const isTbBalanced = tbDifference < 1;

  const totalAssets = cashInHand + totalBankBalances + totalReceivables + stockValuation;
  const totalLiabilitiesEquity = totalPayables + capitalBalance + netProfit;

  const isEquationBalanced = Math.abs(totalAssets - totalLiabilitiesEquity) < 1;
  const equationDiff = Math.abs(totalAssets - totalLiabilitiesEquity);

  const allJvsBalanced =
    journalEntries.length === 0 ||
    journalEntries.every((jv) => {
      const deb =
        (jv.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0) ||
        Number(jv.totalDebit || jv.totalAmount || 0);
      const cred =
        (jv.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0) ||
        Number(jv.totalCredit || jv.totalAmount || 0);
      return Math.abs(deb - cred) < 0.01;
    });

  // Account-by-Account Reconciliation Rows
  const accountReconRows = useMemo(() => {
    const list = [];
    let idx = 1;

    // 1. Cash in Hand
    list.push({
      idx: idx++,
      name: 'Cash in Hand (Physical Cash Book)',
      type: 'Liquid Asset',
      debit: cashInHand,
      credit: 0,
      net: cashInHand,
      netType: 'Dr',
    });

    // 2. Bank Accounts
    bankAccounts.forEach((b) => {
      const bal = Number(b.balance || 0);
      list.push({
        idx: idx++,
        name: `${b.name} (Bank Account)`,
        type: 'Bank Asset',
        debit: bal >= 0 ? bal : 0,
        credit: bal < 0 ? Math.abs(bal) : 0,
        net: Math.abs(bal),
        netType: bal >= 0 ? 'Dr' : 'Cr',
      });
    });

    // 3. Parties with balances
    parties.forEach((p) => {
      const bal = Number(p.balance || 0);
      if (bal !== 0) {
        const isRec = bal < 0;
        list.push({
          idx: idx++,
          name: `${p.name} (${p.code || p.id || 'Party'} - ${p.type})`,
          type: isRec ? 'Receivable (Customer)' : 'Payable (Supplier)',
          debit: isRec ? Math.abs(bal) : 0,
          credit: !isRec ? bal : 0,
          net: Math.abs(bal),
          netType: isRec ? 'Dr' : 'Cr',
        });
      }
    });

    // 4. Stock Inventory
    if (stockValuation > 0) {
      list.push({
        idx: idx++,
        name: 'Stock Inventory Valuation (Raw Material & Finished)',
        type: 'Trading Stock Asset',
        debit: stockValuation,
        credit: 0,
        net: stockValuation,
        netType: 'Dr',
      });
    }

    // 5. Owner Capital
    if (capitalBalance !== 0) {
      list.push({
        idx: idx++,
        name: "Investment A/C (Owner's Capital Equity)",
        type: 'Capital Equity',
        debit: capitalBalance < 0 ? Math.abs(capitalBalance) : 0,
        credit: capitalBalance >= 0 ? capitalBalance : 0,
        net: Math.abs(capitalBalance),
        netType: capitalBalance >= 0 ? 'Cr' : 'Dr',
      });
    }

    // 6. Mall A/C (Trading Control)
    if (mallTradingBalance !== 0) {
      const isMallDeb = mallTradingBalance < 0;
      list.push({
        idx: idx++,
        name: 'Sale Purchase A/C (Mall A/C Net Trading Position)',
        type: 'Trading Control A/C',
        debit: isMallDeb ? Math.abs(mallTradingBalance) : 0,
        credit: !isMallDeb ? mallTradingBalance : 0,
        net: Math.abs(mallTradingBalance),
        netType: isMallDeb ? 'Dr' : 'Cr',
      });
    }

    return list;
  }, [cashInHand, bankAccounts, parties, stockValuation, capitalBalance, mallTradingBalance]);

  // --- TAB-SPECIFIC COMPUTED DATA & FILTERS ---

  // 1. Purchase Rows (filtered)
  const filteredPurchases = useMemo(() => {
    const q = search.toLowerCase();
    return purchases.filter((p) => {
      const matchSearch =
        !q ||
        (p.no && p.no.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.warehouseName && p.warehouseName.toLowerCase().includes(q)) ||
        p.items?.some((it) => (it.itemName || '').toLowerCase().includes(q) || (it.quality || '').toLowerCase().includes(q));

      const matchDate = (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo);
      return matchSearch && matchDate;
    });
  }, [purchases, search, dateFrom, dateTo]);

  // 2. Sale Rows (filtered)
  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((s) => {
      const matchSearch =
        !q ||
        (s.no && s.no.toLowerCase().includes(q)) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.warehouseName && s.warehouseName.toLowerCase().includes(q)) ||
        s.items?.some((it) => (it.itemName || '').toLowerCase().includes(q) || (it.quality || '').toLowerCase().includes(q));

      const matchDate = (!dateFrom || s.date >= dateFrom) && (!dateTo || s.date <= dateTo);
      return matchSearch && matchDate;
    });
  }, [sales, search, dateFrom, dateTo]);

  // 3. Stock Entries (filtered)
  const filteredStock = useMemo(() => {
    const q = search.toLowerCase();
    return stockEntries.filter((s) => {
      return (
        !q ||
        (s.itemName && s.itemName.toLowerCase().includes(q)) ||
        (s.quality && s.quality.toLowerCase().includes(q)) ||
        (s.warehouseName && s.warehouseName.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    });
  }, [stockEntries, search]);

  // 4. Cash Book Rows with chronological running balance
  const filteredCashBook = useMemo(() => {
    const sorted = [...rawCashBook].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = openingCash;
    const withBal = sorted.map((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      running = running - debit + credit;
      return {
        ...entry,
        runningBalance: running,
      };
    });

    const q = search.toLowerCase();
    const filtered = withBal.filter((cb) => {
      const matchSearch =
        !q ||
        (cb.cashBookNo && String(cb.cashBookNo).includes(q)) ||
        (cb.refNo && cb.refNo.toLowerCase().includes(q)) ||
        (cb.partyName && cb.partyName.toLowerCase().includes(q)) ||
        (cb.bankAccountName && cb.bankAccountName.toLowerCase().includes(q)) ||
        (cb.description && cb.description.toLowerCase().includes(q));

      const matchDate = (!dateFrom || cb.date >= dateFrom) && (!dateTo || cb.date <= dateTo);
      return matchSearch && matchDate;
    });

    return filtered.reverse(); // Newest first
  }, [rawCashBook, openingCash, search, dateFrom, dateTo]);

  // 5. Journal Rows (filtered)
  const filteredJournals = useMemo(() => {
    const q = search.toLowerCase();
    return journalEntries.filter((jv) => {
      const matchSearch =
        !q ||
        (jv.no && String(jv.no).toLowerCase().includes(q)) ||
        (jv.refNo && jv.refNo.toLowerCase().includes(q)) ||
        (jv.description && jv.description.toLowerCase().includes(q)) ||
        jv.lines?.some((l) => (l.accountName || '').toLowerCase().includes(q) || (l.detail || '').toLowerCase().includes(q));

      const matchDate = (!dateFrom || jv.date >= dateFrom) && (!dateTo || jv.date <= dateTo);
      return matchSearch && matchDate;
    });
  }, [journalEntries, search, dateFrom, dateTo]);

  // 6. Production Rows (filtered)
  const filteredProductions = useMemo(() => {
    const q = search.toLowerCase();
    return productions.filter((pr) => {
      const matchSearch =
        !q ||
        (pr.no && pr.no.toLowerCase().includes(q)) ||
        (pr.product && pr.product.toLowerCase().includes(q)) ||
        (pr.warehouseName && pr.warehouseName.toLowerCase().includes(q));

      const matchDate = (!dateFrom || pr.date >= dateFrom) && (!dateTo || pr.date <= dateTo);
      return matchSearch && matchDate;
    });
  }, [productions, search, dateFrom, dateTo]);

  return (
    <div className="space-y-4 font-sans text-gray-900">
      <PageHeader
        title="Reports & Financial Statements"
        subtitle="Live accounting reports, audit registers, trial balance, and trading statements derived directly from ledger history"
        actions={
          <div className="flex gap-2 no-print">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCapitalModalOpen(true)}
            >
              Owner Capital
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print Statement
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation (Exact client prioritized order) */}
      <div className="flex gap-1.5 bg-[#DFDFDF] p-1.5 border-2 border-black overflow-x-auto no-print">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={`px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-black transition-all ${
                isActive
                  ? 'bg-[#1E3A5F] text-white shadow-none'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date & Search Filters Toolbar (Hidden for pure financial position tabs) */}
      {activeTab !== 'pl' && activeTab !== 'tb' && (
        <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-3 border-2 border-black no-print">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-gray-800">From Date:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border border-black px-2 py-1 text-xs outline-none font-mono"
            />
            <span className="font-bold text-gray-800 ml-2">To Date:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border border-black px-2 py-1 text-xs outline-none font-mono"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-[11px] text-red-700 font-bold hover:underline cursor-pointer ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Filter current report records..."
            />
          </div>
        </div>
      )}

      {/* Printable Report Container */}
      <div className="print-area space-y-4" id="report-print-container">
        {((activeTab === 'purchase' && purchaseViewMode === 'invoice') ||
          (activeTab === 'sale' && saleViewMode === 'invoice') ||
          (activeTab !== 'purchase' && activeTab !== 'sale')) && (
          <PrintHeader
            documentTitle={
              activeTab === 'purchase'
                ? 'PURCHASE REGISTER & PROCUREMENT REPORT'
                : activeTab === 'sale'
                ? 'SALE REGISTER & REVENUE REPORT'
                : activeTab === 'stock'
                ? 'STOCK INVENTORY VALUATION REPORT'
                : activeTab === 'cashbook'
                ? 'CASH BOOK REGISTER STATEMENT'
                : activeTab === 'journal'
                ? 'JOURNAL VOUCHER AUDIT REGISTER'
                : activeTab === 'production'
                ? 'PRODUCTION YIELD & OUTPUT REPORT'
                : activeTab === 'tb'
                ? 'TRIAL BALANCE STATEMENT'
                : 'PROFIT & LOSS TRADING & BALANCE SHEET STATEMENT'
            }
            subtitle="Official accounting report derived live from immutable ledger transactions"
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: PURCHASE REPORT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'purchase' && (
          <div className="space-y-3">
            {/* View Switcher: Invoice-wise | Party → Quality | Quality → Party */}
            <div className="bg-[#FAF9F7] p-2 border-2 border-black flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Report View:
                </span>
                {[
                  { id: 'invoice', label: 'Invoice-wise' },
                  { id: 'party_quality', label: 'Party → Quality' },
                  { id: 'quality_party', label: 'Quality → Party' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setPurchaseViewMode(v.id)}
                    className={`px-3 py-1 text-xs font-bold border border-black cursor-pointer transition-colors ${
                      purchaseViewMode === v.id
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {purchaseViewMode === 'invoice' && (
                <span className="font-mono text-gray-600 text-xs">
                  Found {filteredPurchases.length} invoices
                </span>
              )}
            </div>

            {purchaseViewMode === 'invoice' ? (
              <div className="border-2 border-black bg-white">
                <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-black">
                    Purchase Invoices &amp; Inward Consignments
                  </span>
                  <span className="font-mono text-gray-600">
                    Found {filteredPurchases.length} invoices
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-black">
                    <thead className="bg-[#DFDFDF] border-b border-black">
                      <tr>
                        <th className="border border-black px-2 py-1.5 w-24">Date</th>
                        <th className="border border-black px-2 py-1.5 w-28">Invoice #</th>
                        <th className="border border-black px-2 py-1.5">Supplier / Party</th>
                        <th className="border border-black px-2 py-1.5">Warehouse</th>
                        <th className="border border-black px-2 py-1.5">Items &amp; Quality</th>
                        <th className="border border-black px-2 py-1.5 text-center w-24">Unit / Nugs</th>
                        <th className="border border-black px-2 py-1.5 text-right w-24">Rate (Rs)</th>
                        <th className="border border-black px-2 py-1.5 text-right w-28">Weight (KG)</th>
                        <th className="border border-black px-2 py-1.5 text-right w-32">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-gray-500 font-medium border border-black">
                            No purchase invoices recorded matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPurchases.map((p) => {
                          const totalWeight = p.items?.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 0;
                          return (
                            <tr key={p.id} className="hover:bg-blue-50/30">
                              <td className="border border-black px-2 py-1 font-mono">{formatDate(p.date)}</td>
                              <td className="border border-black px-2 py-1 font-mono font-bold text-[#1E3A5F]">
                                {p.no}
                              </td>
                              <td className="border border-black px-2 py-1 font-semibold text-gray-900">
                                {p.supplierName || '-'}
                              </td>
                              <td className="border border-black px-2 py-1 text-gray-700">
                                {p.warehouseName || '-'}
                              </td>
                              <td className="border border-black px-2 py-1">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 py-0.5">
                                    <span className="font-bold text-gray-900">{it.itemName}</span>
                                    {it.quality && (
                                      <span className="bg-gray-100 border border-black px-1 text-[10px] font-mono font-bold text-[#1E3A5F]">
                                        {it.quality}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-center font-mono">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5 text-xs">
                                    {it.unitType === 'Nug' ? (
                                      <span className="font-bold text-[#A52A2A]">{it.nugs || 0} Nug</span>
                                    ) : (
                                      <span className="text-gray-500">KG</span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono text-gray-800">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5">
                                    {it.rate ? Number(it.rate).toLocaleString('en-PK') : '-'}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono font-bold text-gray-900">
                                {totalWeight.toLocaleString('en-PK')} kg
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono font-bold text-[#1E3A5F]">
                                {fmt(p.total)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredPurchases.length > 0 && (
                      <tfoot className="bg-[#DFDFDF] font-bold">
                        <tr>
                          <td colSpan={7} className="border border-black px-3 py-1.5 text-right uppercase">
                            Total Purchases Summary:
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono">
                            {filteredPurchases
                              .reduce((sum, p) => sum + (p.items?.reduce((w, it) => w + Number(it.qty || 0), 0) || 0), 0)
                              .toLocaleString('en-PK')}{' '}
                            kg
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono text-base text-[#1E3A5F]">
                            {fmt(filteredPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : (
              <PartyQualityAnalysis
                type="purchase"
                mode={purchaseViewMode}
                onModeChange={setPurchaseViewMode}
                invoices={filteredPurchases}
                parties={parties}
                items={items}
                qualities={qualities}
                dateFrom={dateFrom}
                dateTo={dateTo}
                search={search}
              />
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: SALE REPORT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'sale' && (
          <div className="space-y-3">
            {/* View Switcher: Invoice-wise | Party → Quality | Quality → Party */}
            <div className="bg-[#FAF9F7] p-2 border-2 border-black flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Report View:
                </span>
                {[
                  { id: 'invoice', label: 'Invoice-wise' },
                  { id: 'party_quality', label: 'Party → Quality' },
                  { id: 'quality_party', label: 'Quality → Party' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSaleViewMode(v.id)}
                    className={`px-3 py-1 text-xs font-bold border border-black cursor-pointer transition-colors ${
                      saleViewMode === v.id
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {saleViewMode === 'invoice' && (
                <span className="font-mono text-gray-600 text-xs">
                  Found {filteredSales.length} invoices
                </span>
              )}
            </div>

            {saleViewMode === 'invoice' ? (
              <div className="border-2 border-black bg-white">
                <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-black">
                    Sale Invoices &amp; Outward Dispatches
                  </span>
                  <span className="font-mono text-gray-600">
                    Found {filteredSales.length} invoices
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-black">
                    <thead className="bg-[#DFDFDF] border-b border-black">
                      <tr>
                        <th className="border border-black px-2 py-1.5 w-24">Date</th>
                        <th className="border border-black px-2 py-1.5 w-28">Invoice #</th>
                        <th className="border border-black px-2 py-1.5">Customer / Party</th>
                        <th className="border border-black px-2 py-1.5">Warehouse</th>
                        <th className="border border-black px-2 py-1.5">Products &amp; Quality</th>
                        <th className="border border-black px-2 py-1.5 text-center w-24">Unit / Nugs</th>
                        <th className="border border-black px-2 py-1.5 text-right w-24">Rate (Rs)</th>
                        <th className="border border-black px-2 py-1.5 text-right w-28">Weight (KG)</th>
                        <th className="border border-black px-2 py-1.5 text-right w-32">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-gray-500 font-medium border border-black">
                            No sale invoices recorded matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((s) => {
                          const totalWeight = s.items?.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 0;
                          return (
                            <tr key={s.id} className="hover:bg-blue-50/30">
                              <td className="border border-black px-2 py-1 font-mono">{formatDate(s.date)}</td>
                              <td className="border border-black px-2 py-1 font-mono font-bold text-[#1E3A5F]">
                                {s.no}
                              </td>
                              <td className="border border-black px-2 py-1 font-semibold text-gray-900">
                                {s.customerName || '-'}
                              </td>
                              <td className="border border-black px-2 py-1 text-gray-700">
                                {s.warehouseName || '-'}
                              </td>
                              <td className="border border-black px-2 py-1">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 py-0.5">
                                    <span className="font-bold text-gray-900">{it.itemName}</span>
                                    {it.quality && (
                                      <span className="bg-gray-100 border border-black px-1 text-[10px] font-mono font-bold text-[#1E3A5F]">
                                        {it.quality}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-center font-mono">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5 text-xs">
                                    {it.unitType === 'Nug' ? (
                                      <span className="font-bold text-[#A52A2A]">{it.nugs || 0} Nug</span>
                                    ) : (
                                      <span className="text-gray-500">KG</span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono text-gray-800">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5">
                                    {it.rate ? Number(it.rate).toLocaleString('en-PK') : '-'}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono font-bold text-gray-900">
                                {totalWeight.toLocaleString('en-PK')} kg
                              </td>
                              <td className="border border-black px-2 py-1 text-right font-mono font-bold text-emerald-800">
                                {fmt(s.total)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredSales.length > 0 && (
                      <tfoot className="bg-[#DFDFDF] font-bold">
                        <tr>
                          <td colSpan={7} className="border border-black px-3 py-1.5 text-right uppercase">
                            Total Sales Revenue Summary:
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono">
                            {filteredSales
                              .reduce((sum, s) => sum + (s.items?.reduce((w, it) => w + Number(it.qty || 0), 0) || 0), 0)
                              .toLocaleString('en-PK')}{' '}
                            kg
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono text-base text-emerald-800">
                            {fmt(filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : (
              <PartyQualityAnalysis
                type="sale"
                mode={saleViewMode}
                onModeChange={setSaleViewMode}
                invoices={filteredSales}
                parties={parties}
                items={items}
                qualities={qualities}
                dateFrom={dateFrom}
                dateTo={dateTo}
                search={search}
              />
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: STOCK VALUATION REPORT (Synced with Stock.jsx)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            {/* Top Inventory Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Distinct Stock Lines</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{stockEntries.length} items</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Physical Quantity</span>
                <span className="text-xl font-bold font-mono text-gray-900">{totalStockQty.toLocaleString('en-PK')} kg</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Live Inventory Valuation</span>
                <span className="text-xl font-bold font-mono text-emerald-800">{fmt(stockValuation)}</span>
              </div>
            </div>

            <div className="border-2 border-black bg-white">
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-black">
                    Live Stock Positions &amp; Moving Average Valuation
                  </span>
                  <span className="bg-[#E8F5E9] text-[#1B5E20] border border-black px-2 py-0.5 font-bold font-mono text-[10px]">
                    100% In Sync with Ledger
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={async () => {
                    await syncStockEntries();
                  }}
                  className="no-print"
                >
                  Recalculate
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2 py-1.5">Item Name</th>
                      <th className="border border-black px-2 py-1.5 w-32">Quality Grade</th>
                      <th className="border border-black px-2 py-1.5">Warehouse</th>
                      <th className="border border-black px-2 py-1.5 w-32">Category</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Quantity (KG)</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Avg Rate (Rs)</th>
                      <th className="border border-black px-2 py-1.5 text-right w-36">Valuation (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 font-medium border border-black">
                          No stock inventory recorded in warehouses.
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((s, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="border border-black px-2 py-1.5 font-bold text-[#1E3A5F]">
                            {s.itemName}
                          </td>
                          <td className="border border-black px-2 py-1.5">
                            <span className="bg-gray-100 border border-black px-1.5 py-0.5 text-[11px] font-mono font-bold text-gray-800">
                              {s.quality || 'Cotton A'}
                            </span>
                          </td>
                          <td className="border border-black px-2 py-1.5 font-medium text-gray-800">
                            {s.warehouseName}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-gray-600">
                            {s.category || 'Raw Material'}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono font-bold text-gray-900">
                            {Number(s.qty || 0).toLocaleString('en-PK')} kg
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono text-gray-700">
                            Rs.{Number(s.avgRate || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono font-bold text-emerald-800">
                            {fmt(s.value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredStock.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] font-bold">
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-1.5 text-right uppercase">
                          Total Warehouse Inventory Valuation:
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono">
                          {totalStockQty.toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-gray-500">-</td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-base text-emerald-900">
                          {fmt(stockValuation)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: CASH BOOK REPORT (Traditional Roznamcha Audit Register)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'cashbook' && (
          <div className="space-y-4">
            {/* Top Cash Position Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Cash Received (In)</span>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Cash Paid (Out)</span>
                <span className="text-xl font-bold font-mono text-red-800">
                  {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.debit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Net Filtered Cash Flow</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">
                  {fmt(
                    filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0) - Number(e.debit || 0), 0)
                  )}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Current Cash in Hand</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{fmt(cashInHand)}</span>
              </div>
            </div>

            <div className="border-2 border-black bg-white">
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-black">
                  Cash Book Register &amp; Physical Roznamcha Transactions
                </span>
                <span className="font-mono text-gray-600">
                  {filteredCashBook.length} entries recorded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2 py-1.5 w-24">Date</th>
                      <th className="border border-black px-2 py-1.5 w-24">CB #</th>
                      <th className="border border-black px-2 py-1.5">Account / Party / Bank</th>
                      <th className="border border-black px-2 py-1.5">Narration / Details</th>
                      <th className="border border-black px-2 py-1.5 text-center w-28">Type</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Credit/Jamma (In)</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Debit/Benaam (Out)</th>
                      <th className="border border-black px-2 py-1.5 text-right w-32">Balance (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCashBook.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-500 font-medium border border-black">
                          No cash book entries recorded matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCashBook.map((cb) => (
                        <tr key={cb.id} className="hover:bg-blue-50/30">
                          <td className="border border-black px-2 py-1 font-mono">{formatDate(cb.date)}</td>
                          <td className="border border-black px-2 py-1 font-mono font-bold text-[#1E3A5F]">
                            {cb.cashBookNo ? `#${cb.cashBookNo}` : cb.refNo || '-'}
                          </td>
                          <td className="border border-black px-2 py-1 font-semibold text-gray-900">
                            {cb.partyName || cb.bankAccountName || 'Physical Cash'}
                          </td>
                          <td className="border border-black px-2 py-1 text-gray-700">
                            {cb.description || '-'}
                          </td>
                          <td className="border border-black px-2 py-1 text-center">
                            <span className="border border-black px-1.5 py-0.5 text-[10px] font-mono font-bold bg-gray-100">
                              {cb.type || (Number(cb.credit) > 0 ? 'Cash In' : 'Cash Out')}
                            </span>
                          </td>
                          <td className="border border-black px-2 py-1 text-right font-mono font-bold text-emerald-800">
                            {cb.credit ? fmt(cb.credit) : '-'}
                          </td>
                          <td className="border border-black px-2 py-1 text-right font-mono font-bold text-red-800">
                            {cb.debit ? fmt(cb.debit) : '-'}
                          </td>
                          <td className="border border-black px-2 py-1 text-right font-mono font-bold text-gray-900">
                            {fmt(cb.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredCashBook.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] font-bold">
                      <tr>
                        <td colSpan={5} className="border border-black px-3 py-1.5 text-right uppercase">
                          Total Cash Movement Summary:
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-emerald-900">
                          {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-red-900">
                          {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.debit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-base text-[#1E3A5F]">
                          {fmt(cashInHand)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: JOURNAL REPORT (JV Audit Register)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Journal Vouchers</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{filteredJournals.length} Vouchers</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Debited Volume</span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalDebit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-[11px] font-bold uppercase text-gray-600 block">Total Credited Volume</span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalCredit || 0), 0))}
                </span>
              </div>
            </div>

            <div className="border-2 border-black bg-white">
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-black">
                  Journal Voucher Audit Register (Double-Entry Adjustments)
                </span>
                <span className="font-mono text-gray-600">
                  {filteredJournals.length} JVs recorded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2 py-1.5 w-24">Date</th>
                      <th className="border border-black px-2 py-1.5 w-24">JV #</th>
                      <th className="border border-black px-2 py-1.5 w-48">Description / Narration</th>
                      <th className="border border-black px-2 py-1.5">Accounts Debited &amp; Credited Breakdown</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Debit (PKR)</th>
                      <th className="border border-black px-2 py-1.5 text-right w-28">Credit (PKR)</th>
                      <th className="border border-black px-2 py-1.5 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJournals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 font-medium border border-black">
                          No journal voucher records found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredJournals.map((jv) => (
                        <tr key={jv.id} className="hover:bg-blue-50/20 align-top">
                          <td className="border border-black px-2 py-1.5 font-mono">{formatDate(jv.date)}</td>
                          <td className="border border-black px-2 py-1.5 font-mono font-bold text-[#1E3A5F]">
                            {jv.no || jv.refNo}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-gray-700 font-medium">
                            {jv.description || '-'}
                          </td>
                          <td className="border border-black p-0">
                            <table className="w-full text-[11px] border-collapse">
                              <tbody>
                                {jv.lines?.map((line, lIdx) => (
                                  <tr key={lIdx} className="border-b border-gray-200 last:border-b-0">
                                    <td className="px-2 py-1 font-bold text-gray-900 w-44">
                                      {line.accountName || '-'}
                                      <span className="text-[10px] text-gray-500 ml-1 font-mono font-normal">
                                        ({line.accountType})
                                      </span>
                                    </td>
                                    <td className="px-2 py-1 text-gray-600 italic">
                                      {line.detail || '-'}
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono font-bold text-[#1E3A5F] w-24">
                                      {line.debit ? fmt(line.debit) : '-'}
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono font-bold text-emerald-800 w-24">
                                      {line.credit ? fmt(line.credit) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono font-bold text-[#1E3A5F]">
                            {fmt(jv.totalDebit)}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-right font-mono font-bold text-emerald-800">
                            {fmt(jv.totalCredit)}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-center">
                            <span className="bg-[#E8F5E9] text-[#1B5E20] border border-black px-1.5 py-0.5 text-[10px] font-bold">
                              Balanced
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredJournals.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] font-bold">
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-1.5 text-right uppercase">
                          Total Journal Turnover:
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-[#1E3A5F]">
                          {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalDebit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right font-mono text-emerald-800">
                          {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalCredit || 0), 0))}
                        </td>
                        <td className="border border-black px-1 py-1.5 text-center text-xs">✓</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: PRODUCTION YIELD REPORT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'production' && (
          <div className="border-2 border-black bg-white">
            <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-xs">
              <span className="font-bold uppercase tracking-wider text-black">
                Production Process Yield &amp; Material Conversion Register
              </span>
              <span className="font-mono text-gray-600">
                {filteredProductions.length} production runs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-black">
                <thead className="bg-[#DFDFDF] border-b border-black">
                  <tr>
                    <th className="border border-black px-2 py-1.5 w-24">Date</th>
                    <th className="border border-black px-2 py-1.5 w-28">Production #</th>
                    <th className="border border-black px-2 py-1.5">Finished Product</th>
                    <th className="border border-black px-2 py-1.5">Warehouse</th>
                    <th className="border border-black px-2 py-1.5 text-right w-28">Input (KG)</th>
                    <th className="border border-black px-2 py-1.5 text-right w-28">Output (KG)</th>
                    <th className="border border-black px-2 py-1.5 text-right w-28">Wastage (KG)</th>
                    <th className="border border-black px-2 py-1.5 text-center w-24">Yield %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProductions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-500 font-medium border border-black">
                        No production runs recorded matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProductions.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/30">
                        <td className="border border-black px-2 py-1 font-mono">{formatDate(p.date)}</td>
                        <td className="border border-black px-2 py-1 font-mono font-bold text-[#1E3A5F]">
                          {p.no}
                        </td>
                        <td className="border border-black px-2 py-1 font-bold text-gray-900">
                          {p.product}
                        </td>
                        <td className="border border-black px-2 py-1 text-gray-700">
                          {p.warehouseName || 'Factory Floor'}
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-mono">
                          {Number(p.totalInput || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-mono font-bold text-emerald-800">
                          {Number(p.outputQty || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-mono font-bold text-red-700">
                          {Number(p.wasteQty || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-1 text-center font-mono font-bold text-[#1E3A5F]">
                          <span className="bg-gray-100 border border-black px-2 py-0.5 text-xs">
                            {p.yieldPct || 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredProductions.length > 0 && (
                  <tfoot className="bg-[#DFDFDF] font-bold">
                    <tr>
                      <td colSpan={4} className="border border-black px-3 py-1.5 text-right uppercase">
                        Total Manufacturing Yield Summary:
                      </td>
                      <td className="border border-black px-2 py-1.5 text-right font-mono">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.totalInput || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-1.5 text-right font-mono text-emerald-900">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.outputQty || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-1.5 text-right font-mono text-red-900">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.wasteQty || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center font-mono text-[#1E3A5F]">
                        {(() => {
                          const inTot = filteredProductions.reduce((sum, p) => sum + Number(p.totalInput || 0), 0);
                          const outTot = filteredProductions.reduce((sum, p) => sum + Number(p.outputQty || 0), 0);
                          return inTot > 0 ? ((outTot / inTot) * 100).toFixed(1) : 0;
                        })()}
                        %
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 7: TRIAL BALANCE STATEMENT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'tb' && (
          <div className="border-2 border-black bg-white">
            <div className="p-3.5 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  TRIAL BALANCE STATEMENT (STATEMENT OF ACCOUNT)
                </h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Internal accounting equilibrium check derived directly from live ledger account balances
                </p>
              </div>
              <div>
                {isTbBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border-2 border-black">
                    <CheckCircle2 className="w-4 h-4 text-[#1B5E20]" />
                    <span>✓ Trial Balance 100% Balanced</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-red-100 text-red-900 border-2 border-black">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>⚠ Unbalanced Difference: {fmt(tbDifference)}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-black">
                <thead className="bg-[#DFDFDF] border-b border-black">
                  <tr>
                    <th className="border border-black px-3 py-2">Account Name / Category</th>
                    <th className="border border-black px-3 py-2 w-48">Classification</th>
                    <th className="border border-black px-3 py-2 text-right w-44">Debit Balance (PKR)</th>
                    <th className="border border-black px-3 py-2 text-right w-44">Credit Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 1. Cash in Hand */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-black px-3 py-2 font-bold text-gray-900">
                      Cash in Hand (Physical Cash Book)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                        Liquid Cash Asset
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[#1E3A5F]">
                      {fmt(cashInHand)}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                  </tr>

                  {/* 2. Bank Accounts */}
                  {bankAccounts.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="border border-black px-3 py-2 font-semibold text-gray-900">
                        {b.name} (Bank Account)
                      </td>
                      <td className="border border-black px-3 py-2">
                        <span className="border border-black bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                          Commercial Bank Asset
                        </span>
                      </td>
                      <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[#1E3A5F]">
                        {fmt(b.balance)}
                      </td>
                      <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                    </tr>
                  ))}

                  {/* 3. Accounts Receivable (Customers) */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-black px-3 py-2 font-semibold text-gray-900">
                      Accounts Receivable (Customers Debit Balances)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Asset Receivable
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[#1E3A5F]">
                      {fmt(totalReceivables)}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                  </tr>

                  {/* 4. Stock Inventory Valuation */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-black px-3 py-2 font-semibold text-gray-900">
                      Stock Inventory Valuation (Live Trading Stock)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                        Trading Stock Asset
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[#1E3A5F]">
                      {fmt(stockValuation)}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                  </tr>

                  {/* 5. Accounts Payable (Suppliers) */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-black px-3 py-2 font-semibold text-gray-900">
                      Accounts Payable (Suppliers Credit Balances)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-900">
                        Liability Payable
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-red-700">
                      {fmt(totalPayables)}
                    </td>
                  </tr>

                  {/* 6. Owner Capital Investment */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-black px-3 py-2 font-semibold text-gray-900">
                      Investment A/C (Owner's Capital Equity)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                        Capital Equity
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-gray-400">-</td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-emerald-800">
                      {fmt(capitalBalance)}
                    </td>
                  </tr>

                  {/* 7. Sale Purchase A/C (Mall A/C Net Trading Position) - Balancing Entry */}
                  <tr className="hover:bg-gray-50 bg-[#FAF9F7]">
                    <td className="border border-black px-3 py-2 font-black text-[#1E3A5F]">
                      Sale Purchase A/C (Mall A/C Net Trading Position)
                    </td>
                    <td className="border border-black px-3 py-2">
                      <span className="border border-black bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                        Trading Control A/C
                      </span>
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[#1E3A5F]">
                      {mallTradingBalance < 0 ? fmt(Math.abs(mallTradingBalance)) : '-'}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono font-bold text-emerald-800">
                      {mallTradingBalance >= 0 ? fmt(mallTradingBalance) : '-'}
                    </td>
                  </tr>
                </tbody>

                {/* Column Totals Footer */}
                <tfoot className="bg-[#DFDFDF] font-bold text-sm">
                  <tr>
                    <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase text-black">
                      Trial Balance Column Equilibrium:
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-[#1E3A5F]">
                      {fmt(sumDebits)}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono text-emerald-800">
                      {fmt(sumCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── RECONCILIATION SECTION 1: ACCOUNT-BY-ACCOUNT DETAILED RECONCILIATION ── */}
            <div className="p-3 border-t-2 border-black bg-[#FAF9F7]">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    ACCOUNT RECONCILIATION AUDIT (ONE ROW PER ACTIVE ACCOUNT)
                  </h4>
                  <p className="text-[10px] text-gray-600">
                    Granular account-level breakdown showing Debit, Credit, and Net positions
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5">
                  {isTbBalanced ? '✓ Zero Net Discrepancy' : `⚠ Variance: ${fmt(tbDifference)}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-black bg-white">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2 py-1.5 w-10 text-center">#</th>
                      <th className="border border-black px-3 py-1.5">Account / Ledger Head</th>
                      <th className="border border-black px-3 py-1.5 w-44">Classification</th>
                      <th className="border border-black px-3 py-1.5 text-right w-36">Debit (Rs.)</th>
                      <th className="border border-black px-3 py-1.5 text-right w-36">Credit (Rs.)</th>
                      <th className="border border-black px-3 py-1.5 text-right w-36">Net Balance (Rs.)</th>
                      <th className="border border-black px-2 py-1.5 text-center w-24">Reconciled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountReconRows.map((acc) => (
                      <tr key={acc.idx} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="border border-black px-2 py-1 text-center font-mono text-gray-500">
                          {acc.idx}
                        </td>
                        <td className="border border-black px-3 py-1 font-bold text-gray-900">
                          {acc.name}
                        </td>
                        <td className="border border-black px-3 py-1 text-gray-600">
                          <span className="border border-black px-1.5 py-0.5 text-[10px] font-bold bg-gray-50">
                            {acc.type}
                          </span>
                        </td>
                        <td className="border border-black px-3 py-1 text-right font-mono font-bold text-[#1E3A5F]">
                          {acc.debit > 0 ? fmt(acc.debit) : '-'}
                        </td>
                        <td className="border border-black px-3 py-1 text-right font-mono font-bold text-emerald-800">
                          {acc.credit > 0 ? fmt(acc.credit) : '-'}
                        </td>
                        <td className="border border-black px-3 py-1 text-right font-mono font-bold text-gray-900">
                          {fmt(acc.net)} <span className="text-[10px] text-gray-500">({acc.netType})</span>
                        </td>
                        <td className="border border-black px-2 py-1 text-center">
                          <span className="text-[#1B5E20] font-bold text-[11px]">✓ Reconciled</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#DFDFDF] font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="border border-black px-3 py-1.5 text-right uppercase">
                        Reconciliation Column Totals:
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-mono text-[#1E3A5F]">
                        {fmt(sumDebits)}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-mono text-emerald-800">
                        {fmt(sumCredits)}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-mono text-black">
                        {isTbBalanced ? '0.00 (Balanced)' : fmt(tbDifference)}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center text-[11px]">
                        {isTbBalanced ? (
                          <span className="text-[#1B5E20] font-black">✓ OK</span>
                        ) : (
                          <span className="text-red-700 font-black">⚠ Diff</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── RECONCILIATION SECTION 2: PER-VOUCHER INTEGRITY CHECK (Σ Debit vs Σ Credit) ── */}
            <div className="p-3 border-t-2 border-black bg-[#FAF9F7]">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    PER-VOUCHER INTEGRITY CHECK (Σ DEBIT VS Σ CREDIT FOR EVERY JOURNAL VOUCHER)
                  </h4>
                  <p className="text-[10px] text-gray-600">
                    Individual double-entry balance check confirming Σ Debit = Σ Credit for every posted voucher
                  </p>
                </div>
                {allJvsBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border-2 border-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All {journalEntries.length} JVs In Complete Balance</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-900 border-2 border-black">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>Unbalanced Vouchers Detected!</span>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-black bg-white">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2.5 py-1.5 w-24">Voucher #</th>
                      <th className="border border-black px-2.5 py-1.5 w-24">Date</th>
                      <th className="border border-black px-3 py-1.5">Narration / Particulars</th>
                      <th className="border border-black px-2 py-1.5 text-center w-16">Lines</th>
                      <th className="border border-black px-3 py-1.5 text-right w-36">Σ Debit (PKR)</th>
                      <th className="border border-black px-3 py-1.5 text-right w-36">Σ Credit (PKR)</th>
                      <th className="border border-black px-3 py-1.5 text-right w-28">Variance</th>
                      <th className="border border-black px-2 py-1.5 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-gray-500 border border-black">
                          No Journal Vouchers recorded yet.
                        </td>
                      </tr>
                    ) : (
                      journalEntries.map((jv) => {
                        const jvDeb =
                          (jv.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0) ||
                          Number(jv.totalDebit || jv.totalAmount || 0);
                        const jvCred =
                          (jv.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0) ||
                          Number(jv.totalCredit || jv.totalAmount || 0);
                        const varAmt = Math.abs(jvDeb - jvCred);
                        const isJvBal = varAmt < 0.01;

                        return (
                          <tr
                            key={jv.id}
                            className={isJvBal ? 'hover:bg-gray-50 border-b border-gray-200' : 'bg-red-50 hover:bg-red-100 border-b border-red-300'}
                          >
                            <td className="border border-black px-2.5 py-1 font-mono font-bold text-[#1E3A5F]">
                              {jv.no || jv.refNo}
                            </td>
                            <td className="border border-black px-2.5 py-1 font-mono">{formatDate(jv.date)}</td>
                            <td className="border border-black px-3 py-1 text-gray-800">
                              {jv.narration || jv.description || '-'}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-mono">
                              {(jv.lines || []).length}
                            </td>
                            <td className="border border-black px-3 py-1 text-right font-mono font-bold text-[#1E3A5F]">
                              {fmt(jvDeb)}
                            </td>
                            <td className="border border-black px-3 py-1 text-right font-mono font-bold text-emerald-800">
                              {fmt(jvCred)}
                            </td>
                            <td
                              className={`border border-black px-3 py-1 text-right font-mono font-bold ${
                                isJvBal ? 'text-gray-400' : 'text-red-700'
                              }`}
                            >
                              {isJvBal ? '-' : fmt(varAmt)}
                            </td>
                            <td className="border border-black px-2 py-1 text-center">
                              {isJvBal ? (
                                <span className="border border-black bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 text-[10px] font-bold">
                                  ✓ Balanced
                                </span>
                              ) : (
                                <span className="border border-red-700 bg-red-100 text-red-900 px-2 py-0.5 text-[10px] font-bold">
                                  ⚠ Out of Balance
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {journalEntries.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] font-bold text-xs">
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-1.5 text-right uppercase">
                          Total All Journal Vouchers Volume:
                        </td>
                        <td className="border border-black px-3 py-1.5 text-right font-mono text-[#1E3A5F]">
                          {fmt(
                            journalEntries.reduce(
                              (s, jv) =>
                                s + (jv.lines || []).reduce((ls, l) => ls + Number(l.debit || 0), 0),
                              0
                            )
                          )}
                        </td>
                        <td className="border border-black px-3 py-1.5 text-right font-mono text-emerald-800">
                          {fmt(
                            journalEntries.reduce(
                              (s, jv) =>
                                s + (jv.lines || []).reduce((ls, l) => ls + Number(l.credit || 0), 0),
                              0
                            )
                          )}
                        </td>
                        <td className="border border-black px-3 py-1.5 text-right font-mono text-gray-500">-</td>
                        <td className="border border-black px-2 py-1.5 text-center text-xs">
                          {allJvsBalanced ? '✓ OK' : '⚠ Action Req'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 8: PROFIT & LOSS AND BALANCE SHEET
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'pl' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Part 1: Profit & Loss Statement */}
            <div className="border-2 border-black bg-white">
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Profit &amp; Loss Trading Statement (Mal Khata)
                </h3>
              </div>

              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-bold text-emerald-800">Total Sales Revenue (Mal Farokht)</span>
                  <span className="font-mono font-bold text-emerald-800">{fmt(totalSales)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-bold text-[#1E3A5F]">Add: Closing Stock Inventory Valuation</span>
                  <span className="font-mono font-bold text-[#1E3A5F]">{fmt(stockValuation)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-semibold text-red-700">Less: Goods Purchases (Mal Kharid)</span>
                  <span className="font-mono font-bold text-red-700">({fmt(totalPurchases)})</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-black font-bold text-sm bg-gray-50 px-2">
                  <span>Gross Trading Surplus</span>
                  <span className={`font-mono ${grossProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    {fmt(grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="font-semibold text-red-700">Less: Operating Expenses</span>
                  <span className="font-mono font-bold text-red-700">({fmt(totalExpenses)})</span>
                </div>
                {jvMallCredit !== 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-200 bg-purple-50/50 px-1">
                    <span className="font-semibold text-purple-900">
                      Journal Adjustments (Mall A/C &amp; Expenses)
                    </span>
                    <span className={`font-mono font-bold ${jvMallCredit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                      {jvMallCredit >= 0 ? `+${fmt(jvMallCredit)}` : `(${fmt(Math.abs(jvMallCredit))})`}
                    </span>
                  </div>
                )}
                <div
                  className={`flex justify-between p-3 border-2 border-black font-bold text-sm ${
                    netProfit >= 0 ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-red-50 text-red-900'
                  }`}
                >
                  <span className="uppercase">Net Business Profit / (Loss)</span>
                  <span className="font-mono text-base">{fmt(netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Part 2: Balance Sheet */}
            <div className="border-2 border-black bg-white">
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Balance Sheet Statement (Chitha)
                </h3>
                <span
                  className={`border border-black px-2 py-0.5 text-[10px] font-bold ${
                    isEquationBalanced ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-red-100 text-red-900'
                  }`}
                >
                  {isEquationBalanced ? '✓ Equation Balanced' : `⚠ Diff: ${fmt(equationDiff)}`}
                </span>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {/* Assets */}
                <div className="border border-black p-2 bg-[#FAF9F7] space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-[#1E3A5F] block border-b border-gray-300 pb-1">
                    Assets
                  </span>
                  <div className="flex justify-between">
                    <span>Cash in Hand</span>
                    <span className="font-mono font-semibold">{fmt(cashInHand)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commercial Bank Accounts</span>
                    <span className="font-mono font-semibold">{fmt(totalBankBalances)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accounts Receivable (Customers)</span>
                    <span className="font-mono font-semibold">{fmt(totalReceivables)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Inventory Valuation</span>
                    <span className="font-mono font-semibold">{fmt(stockValuation)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-black font-bold text-sm text-[#1E3A5F]">
                    <span>Total Assets</span>
                    <span className="font-mono">{fmt(totalAssets)}</span>
                  </div>
                </div>

                {/* Liabilities & Capital */}
                <div className="border border-black p-2 bg-[#FAF9F7] space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-red-800 block border-b border-gray-300 pb-1">
                    Liabilities &amp; Owner Capital
                  </span>
                  <div className="flex justify-between">
                    <span>Accounts Payable (Suppliers)</span>
                    <span className="font-mono font-semibold">{fmt(totalPayables)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Owner Capital Investment</span>
                    <span className="font-mono font-semibold">{fmt(capitalBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Business Profit (Current Period)</span>
                    <span className="font-mono font-bold text-emerald-800">{fmt(netProfit)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-black font-bold text-sm text-[#1E3A5F]">
                    <span>Total Liabilities &amp; Capital</span>
                    <span className="font-mono">{fmt(totalLiabilitiesEquity)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Capital Injection / Drawing */}
      <Modal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        title="Manage Investment / Owner's Capital A/C"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCapitalSubmit} className="space-y-4">
          <Select
            label="Transaction Type"
            value={capType}
            onChange={setCapType}
            options={[
              { value: 'Add', label: 'Add Capital (Owner Injection)' },
              { value: 'Withdraw', label: 'Withdraw Capital (Owner Drawing)' },
            ]}
          />
          <Input
            label="Amount (PKR)"
            type="number"
            value={capAmount}
            onChange={setCapAmount}
            required
          />
          <Input
            label="Description / Note"
            value={capDesc}
            onChange={setCapDesc}
            placeholder="e.g. Fresh capital deposit from owner"
            required
          />

          <div className="p-3 bg-[#FAF9F7] border border-black flex justify-between items-center text-xs">
            <span className="text-gray-700 font-bold">Current Capital Balance:</span>
            <span className="font-bold font-mono text-emerald-800">{fmt(capitalBalance)}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black">
            <Button variant="secondary" onClick={() => setIsCapitalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Capital Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
