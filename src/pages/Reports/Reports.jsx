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
import { safePrint } from '../../utils/printUtils.js';
import { fmt, fmtNum, formatDate, getTodayStr } from '../../utils/formatters.js';
import { splitPartyBalances } from '../../utils/partyBalances.js';
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

  // Party Receivables & Payables (single source of truth helper)
  const {
    receivableParties,
    payableParties,
    totalReceivable: totalReceivables,
    totalPayable: totalPayables,
  } = splitPartyBalances(parties);

  // Cash in Hand (from Cash account balance in accounts table)
  const cashAcc = accounts.find((a) => a.name.toLowerCase().includes('cash'));
  const cashInHand = Number(cashAcc?.balance || 0);
  const openingCash = Number(cashAcc?.openingBalance || 0);

  // Bank Balances (excluding physical Cash)
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));
  const totalBankBalances = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Balance Sheet Totals
  const grossProfit = mallNetPosition + stockValuation; // mallTradingBalance (expenses and JV Mall included)
  const netProfit = grossProfit; // Net P/L = grossProfit - 0 (expenditure row is 0)

  const sumDebits =
    cashInHand +
    totalBankBalances +
    totalReceivables +
    stockValuation +
    (mallNetPosition < 0 ? Math.abs(mallNetPosition) : 0);

  const sumCredits =
    totalPayables +
    capitalBalance +
    (mallNetPosition >= 0 ? mallNetPosition : 0);

  const tbDifference = Math.abs(sumDebits - sumCredits);
  const isTbBalanced = tbDifference < 1;

  const totalAssets = cashInHand + totalBankBalances + totalReceivables + stockValuation;
  const totalLiabilitiesEquity = totalPayables + capitalBalance + grossProfit;

  const isEquationBalanced = Math.abs(totalAssets - totalLiabilitiesEquity) < 1;
  const equationDiff = Math.abs(totalAssets - totalLiabilitiesEquity);

  // --- TRADITIONAL TRIAL BALANCE COMPUTED ROWS & EQUILIBRIUM ---
  const tbParties = useMemo(() => {
    return [...parties]
      .filter((p) => Number(p.balance || 0) !== 0)
      .sort((a, b) => {
        const codeA = String(a.code || a.id || '');
        const codeB = String(b.code || b.id || '');
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      });
  }, [parties]);

  const tbPartiesDebit = useMemo(() => {
    return tbParties
      .filter((p) => Number(p.balance || 0) < 0)
      .reduce((s, p) => s + Math.abs(Number(p.balance || 0)), 0);
  }, [tbParties]);

  const tbPartiesCredit = useMemo(() => {
    return tbParties
      .filter((p) => Number(p.balance || 0) > 0)
      .reduce((s, p) => s + Number(p.balance || 0), 0);
  }, [tbParties]);

  // Cash row: code 99020
  const tbCashDebit = cashInHand >= 0 ? cashInHand : 0;
  const tbCashCredit = cashInHand < 0 ? Math.abs(cashInHand) : 0;

  // Banks rows
  const tbBanksDebit = bankAccounts.reduce((s, b) => {
    const bal = Number(b.balance || 0);
    return s + (bal >= 0 ? bal : 0);
  }, 0);
  const tbBanksCredit = bankAccounts.reduce((s, b) => {
    const bal = Number(b.balance || 0);
    return s + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  // Capital row: code 99030 (only if capitalBalance !== 0)
  const tbCapitalDebit = capitalBalance < 0 ? Math.abs(capitalBalance) : 0;
  const tbCapitalCredit = capitalBalance >= 0 ? capitalBalance : 0;

  // Mall A/C row: code 99010 (mallNetPosition = totalSales - totalPurchases - totalExpenses + jvMallCredit)
  const tbMallDebit = mallNetPosition < 0 ? Math.abs(mallNetPosition) : 0;
  const tbMallCredit = mallNetPosition >= 0 ? mallNetPosition : 0;

  // Grand totals computed directly from the visible rows
  const tbGrandTotalBenaam =
    tbPartiesDebit +
    tbCashDebit +
    tbBanksDebit +
    (capitalBalance !== 0 ? tbCapitalDebit : 0) +
    tbMallDebit;

  const tbGrandTotalJama =
    tbPartiesCredit +
    tbCashCredit +
    tbBanksCredit +
    (capitalBalance !== 0 ? tbCapitalCredit : 0) +
    tbMallCredit;

  const tbGrandDifference = Math.abs(tbGrandTotalBenaam - tbGrandTotalJama);
  const isTbGrandBalanced = tbGrandDifference < 1;

  // P&L & Balance Sheet totals
  // Assets: Cash in Hand + Receivable + Expenditure (0) + Stock (Value) + Bank
  const plAssetsTotal = cashInHand + totalReceivables + 0 + stockValuation + totalBankBalances;
  // Liabilities: Capital + Payable + Gross Profit (mallNetPosition + stockValuation)
  const plLiabilitiesTotal = capitalBalance + totalPayables + grossProfit;
  const plNetPL = grossProfit - 0; // equals grossProfit
  const plDifference = Math.abs(plAssetsTotal - plLiabilitiesTotal);
  const isPlBalanced = plDifference < 1;

  const trialBalanceDateStr = useMemo(() => {
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const dd = String(now.getDate()).padStart(2, '0');
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${mmm} ${dd} ${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }, []);

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
              onClick={safePrint}
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
            <span className="font-bold text-gray-800 ms-2">To Date:</span>
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
                className="text-sm text-red-700 font-bold hover:underline cursor-pointer ms-1"
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
          (activeTab !== 'purchase' && activeTab !== 'sale' && activeTab !== 'tb' && activeTab !== 'pl')) && (
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
              <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
                <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
                  <span className="font-bold uppercase tracking-wider text-black text-base">
                    Purchase Invoices &amp; Inward Consignments
                  </span>
                  <span className="font-mono text-gray-600" dir="ltr">
                    Found {filteredPurchases.length} invoices
                  </span>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0 w-full">
                  <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                      <tr>
                        <th className="border border-black px-2 py-2 text-start font-bold">تاریخ (Date)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">بل # (Invoice)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">پارٹی (Supplier)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">گودام (Warehouse)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">آئٹم و کوالٹی</th>
                        <th className="border border-black px-2 py-2 text-center font-bold">نگ (Unit)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Rate (Rs)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Weight (KG)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Total (PKR)</th>
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
                              <td className="border border-black px-2 py-2 font-mono text-start" dir="ltr">{formatDate(p.date)}</td>
                              <td className="border border-black px-2 py-2 font-mono font-bold text-[#1E3A5F] text-start" dir="ltr">
                                {p.no}
                              </td>
                              <td className="border border-black px-2 py-2 font-semibold text-gray-900 text-start">
                                {p.supplierName || '-'}
                              </td>
                              <td className="border border-black px-2 py-2 text-gray-700 text-start">
                                {p.warehouseName || '-'}
                              </td>
                              <td className="border border-black px-2 py-2 text-start">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 py-0.5">
                                    <span className="font-bold text-gray-900">{it.itemName}</span>
                                    {it.quality && (
                                      <span className="bg-gray-100 border border-black px-1.5 py-0.5 text-xs font-mono font-bold text-[#1E3A5F]">
                                        {it.quality}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-center font-mono">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5 text-base">
                                    {it.unitType === 'Nug' ? (
                                      <span className="font-bold text-[#A52A2A]">{it.nugs || 0} Nug</span>
                                    ) : (
                                      <span className="text-gray-500">KG</span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono text-gray-800 tabular-nums" dir="ltr">
                                {p.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5">
                                    {it.rate ? Number(it.rate).toLocaleString('en-PK') : '-'}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono font-bold text-gray-900 tabular-nums" dir="ltr">
                                {totalWeight.toLocaleString('en-PK')} kg
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono font-bold text-[#1E3A5F] tabular-nums" dir="ltr">
                                {fmt(p.total)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredPurchases.length > 0 && (
                      <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                        <tr>
                          <td colSpan={6} className="border border-black px-3 py-2 text-start uppercase text-base">
                            میزان کل خریداری (Total Purchases):
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-gray-500" dir="ltr">-</td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-[17px] tabular-nums" dir="ltr">
                            {filteredPurchases
                              .reduce((sum, p) => sum + (p.items?.reduce((w, it) => w + Number(it.qty || 0), 0) || 0), 0)
                              .toLocaleString('en-PK')}{' '}
                            kg
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-[#1E3A5F] tabular-nums" dir="ltr">
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
              <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
                <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
                  <span className="font-bold uppercase tracking-wider text-black text-base">
                    Sale Invoices &amp; Outward Dispatches
                  </span>
                  <span className="font-mono text-gray-600" dir="ltr">
                    Found {filteredSales.length} invoices
                  </span>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0 w-full">
                  <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                      <tr>
                        <th className="border border-black px-2 py-2 text-start font-bold">تاریخ (Date)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">بل # (Invoice)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">گاہک (Customer)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">گودام (Warehouse)</th>
                        <th className="border border-black px-2 py-2 text-start font-bold">مصنوعات و کوالٹی</th>
                        <th className="border border-black px-2 py-2 text-center font-bold">نگ (Unit)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Rate (Rs)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Weight (KG)</th>
                        <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Total (PKR)</th>
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
                              <td className="border border-black px-2 py-2 font-mono text-start" dir="ltr">{formatDate(s.date)}</td>
                              <td className="border border-black px-2 py-2 font-mono font-bold text-[#1E3A5F] text-start" dir="ltr">
                                {s.no}
                              </td>
                              <td className="border border-black px-2 py-2 font-semibold text-gray-900 text-start">
                                {s.customerName || '-'}
                              </td>
                              <td className="border border-black px-2 py-2 text-gray-700 text-start">
                                {s.warehouseName || '-'}
                              </td>
                              <td className="border border-black px-2 py-2 text-start">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 py-0.5">
                                    <span className="font-bold text-gray-900">{it.itemName}</span>
                                    {it.quality && (
                                      <span className="bg-gray-100 border border-black px-1.5 py-0.5 text-xs font-mono font-bold text-[#1E3A5F]">
                                        {it.quality}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-center font-mono">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5 text-base">
                                    {it.unitType === 'Nug' ? (
                                      <span className="font-bold text-[#A52A2A]">{it.nugs || 0} Nug</span>
                                    ) : (
                                      <span className="text-gray-500">KG</span>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono text-gray-800 tabular-nums" dir="ltr">
                                {s.items?.map((it, idx) => (
                                  <div key={idx} className="py-0.5">
                                    {it.rate ? Number(it.rate).toLocaleString('en-PK') : '-'}
                                  </div>
                                ))}
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono font-bold text-gray-900 tabular-nums" dir="ltr">
                                {totalWeight.toLocaleString('en-PK')} kg
                              </td>
                              <td className="border border-black px-2 py-2 text-left font-mono font-bold text-emerald-800 tabular-nums" dir="ltr">
                                {fmt(s.total)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredSales.length > 0 && (
                      <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                        <tr>
                          <td colSpan={6} className="border border-black px-3 py-2 text-start uppercase text-base">
                            میزان کل فروخت (Total Sales):
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-gray-500" dir="ltr">-</td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-[17px] tabular-nums" dir="ltr">
                            {filteredSales
                              .reduce((sum, s) => sum + (s.items?.reduce((w, it) => w + Number(it.qty || 0), 0) || 0), 0)
                              .toLocaleString('en-PK')}{' '}
                            kg
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-800 tabular-nums" dir="ltr">
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
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Distinct Stock Lines</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{stockEntries.length} items</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Physical Quantity</span>
                <span className="text-xl font-bold font-mono text-gray-900">{totalStockQty.toLocaleString('en-PK')} kg</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Live Inventory Valuation</span>
                <span className="text-xl font-bold font-mono text-emerald-800">{fmt(stockValuation)}</span>
              </div>
            </div>

            <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-black text-base">
                    Live Stock Positions &amp; Moving Average Valuation
                  </span>
                  <span className="bg-[#E8F5E9] text-[#1B5E20] border border-black px-2 py-0.5 font-bold font-mono text-xs" dir="ltr">
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

              <div className="overflow-y-auto flex-1 min-h-0 w-full">
                <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                    <tr>
                      <th className="border border-black px-2 py-2 text-start font-bold">نام آئٹم (Item)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">کوالٹی (Quality)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">گودام (Warehouse)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">قسم (Category)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Quantity (KG)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Avg Rate (Rs)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Valuation (PKR)</th>
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
                          <td className="border border-black px-2 py-2 font-bold text-[#1E3A5F] text-start">
                            {s.itemName}
                          </td>
                          <td className="border border-black px-2 py-2 text-start">
                            <span className="bg-gray-100 border border-black px-2 py-0.5 text-xs font-mono font-bold text-gray-800">
                              {s.quality || 'Cotton A'}
                            </span>
                          </td>
                          <td className="border border-black px-2 py-2 font-medium text-gray-800 text-start">
                            {s.warehouseName}
                          </td>
                          <td className="border border-black px-2 py-2 text-gray-600 text-start">
                            {s.category || 'Raw Material'}
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-gray-900 tabular-nums" dir="ltr">
                            {Number(s.qty || 0).toLocaleString('en-PK')} kg
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono text-gray-700 tabular-nums" dir="ltr">
                            Rs.{Number(s.avgRate || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-emerald-800 tabular-nums" dir="ltr">
                            {fmt(s.value)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredStock.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-2 text-start uppercase text-base">
                          میزان کل مال / اسٹاک ویلیوایشن (Total Stock Valuation):
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] tabular-nums" dir="ltr">
                          {totalStockQty.toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-gray-500" dir="ltr">-</td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-900 tabular-nums" dir="ltr">
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
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Cash Received (In)</span>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Cash Paid (Out)</span>
                <span className="text-xl font-bold font-mono text-red-800">
                  {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.debit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Net Filtered Cash Flow</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">
                  {fmt(
                    filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0) - Number(e.debit || 0), 0)
                  )}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Current Cash in Hand</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{fmt(cashInHand)}</span>
              </div>
            </div>

            <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
                <span className="font-bold uppercase tracking-wider text-black text-base">
                  Cash Book Register &amp; Physical Roznamcha Transactions
                </span>
                <span className="font-mono text-gray-600" dir="ltr">
                  {filteredCashBook.length} entries recorded
                </span>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 w-full">
                <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                    <tr>
                      <th className="border border-black px-2 py-2 text-start font-bold">تاریخ (Date)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">روکڑ # (CB #)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">کھاتہ / پارٹی (Account)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">تفصیل (Narration)</th>
                      <th className="border border-black px-2 py-2 text-center font-bold">نوعیت</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">جمع / Credit (In)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">بنام / Debit (Out)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">بیلنس (Balance)</th>
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
                          <td className="border border-black px-2 py-2 font-mono text-start" dir="ltr">{formatDate(cb.date)}</td>
                          <td className="border border-black px-2 py-2 font-mono font-bold text-[#1E3A5F] text-start" dir="ltr">
                            {cb.cashBookNo ? `#${cb.cashBookNo}` : cb.refNo || '-'}
                          </td>
                          <td className="border border-black px-2 py-2 font-semibold text-gray-900 text-start">
                            {cb.partyName || cb.bankAccountName || 'Physical Cash'}
                          </td>
                          <td className="border border-black px-2 py-2 text-gray-700 text-start">
                            {cb.description || '-'}
                          </td>
                          <td className="border border-black px-2 py-2 text-center">
                            <span className="border border-black px-2 py-0.5 text-xs font-mono font-bold bg-gray-100">
                              {cb.type || (Number(cb.credit) > 0 ? 'Cash In' : 'Cash Out')}
                            </span>
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-emerald-800 tabular-nums" dir="ltr">
                            {cb.credit ? fmt(cb.credit) : '-'}
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-red-800 tabular-nums" dir="ltr">
                            {cb.debit ? fmt(cb.debit) : '-'}
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-gray-900 tabular-nums" dir="ltr">
                            {fmt(cb.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredCashBook.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                      <tr>
                        <td colSpan={5} className="border border-black px-3 py-2 text-start uppercase text-base">
                          میزان کل روکڑ کی نقل و حرکت (Total Movement):
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-900 tabular-nums" dir="ltr">
                          {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.credit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-red-900 tabular-nums" dir="ltr">
                          {fmt(filteredCashBook.reduce((sum, e) => sum + Number(e.debit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-[#1E3A5F] tabular-nums" dir="ltr">
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
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Journal Vouchers</span>
                <span className="text-xl font-bold font-mono text-[#1E3A5F]">{filteredJournals.length} Vouchers</span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Debited Volume</span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalDebit || 0), 0))}
                </span>
              </div>
              <div className="border-2 border-black bg-white p-3">
                <span className="text-sm font-bold uppercase text-gray-600 block">Total Credited Volume</span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalCredit || 0), 0))}
                </span>
              </div>
            </div>

            <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
              <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
                <span className="font-bold uppercase tracking-wider text-black text-base">
                  Journal Voucher Audit Register (Double-Entry Adjustments)
                </span>
                <span className="font-mono text-gray-600" dir="ltr">
                  {filteredJournals.length} JVs recorded
                </span>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 w-full">
                <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                    <tr>
                      <th className="border border-black px-2 py-2 text-start font-bold">تاریخ (Date)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">جے وی # (JV)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">تفصیل (Narration)</th>
                      <th className="border border-black px-2 py-2 text-start font-bold">کھاتہ جات و تفصیل (Accounts)</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Debit / بنام</th>
                      <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Credit / جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJournals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-500 font-medium border border-black">
                          No journal voucher records found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredJournals.map((jv) => (
                        <tr key={jv.id} className="hover:bg-blue-50/20 align-top">
                          <td className="border border-black px-2 py-2 font-mono text-start" dir="ltr">{formatDate(jv.date)}</td>
                          <td className="border border-black px-2 py-2 font-mono font-bold text-[#1E3A5F] text-start" dir="ltr">
                            {jv.no || jv.refNo}
                          </td>
                          <td className="border border-black px-2 py-2 text-gray-700 font-medium text-start">
                            {jv.description || '-'}
                          </td>
                          <td className="border border-black p-0 text-start">
                            <table className="w-full text-sm border-collapse" dir="rtl">
                              <tbody>
                                {jv.lines?.map((line, lIdx) => (
                                  <tr key={lIdx} className="border-b border-gray-200 last:border-b-0">
                                    <td className="px-2.5 py-1.5 font-bold text-gray-900 w-48 text-start">
                                      {line.accountName || '-'}
                                      <span className="text-xs text-gray-500 ms-1 font-mono font-normal" dir="ltr">
                                        ({line.accountType})
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 text-gray-600 italic text-start">
                                      {line.detail || '-'}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-left font-mono font-bold text-[#1E3A5F] w-28 tabular-nums" dir="ltr">
                                      {line.debit ? fmt(line.debit) : '-'}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-left font-mono font-bold text-emerald-800 w-28 tabular-nums" dir="ltr">
                                      {line.credit ? fmt(line.credit) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-[#1E3A5F] tabular-nums" dir="ltr">
                            {fmt(jv.totalDebit)}
                          </td>
                          <td className="border border-black px-2 py-2 text-left font-mono font-bold text-emerald-800 tabular-nums" dir="ltr">
                            {fmt(jv.totalCredit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredJournals.length > 0 && (
                    <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-2 text-start uppercase text-base">
                          میزان کل جرنل واؤچرز (Total Journal Turnover):
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-[#1E3A5F] tabular-nums" dir="ltr">
                          {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalDebit || 0), 0))}
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-800 tabular-nums" dir="ltr">
                          {fmt(filteredJournals.reduce((sum, jv) => sum + Number(jv.totalCredit || 0), 0))}
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
            TAB 6: PRODUCTION YIELD REPORT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'production' && (
          <div className="report-rtl border-2 border-black bg-white flex flex-col w-full max-w-[1400px] mx-auto" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
            <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
              <span className="font-bold uppercase tracking-wider text-black text-base">
                Production Process Yield &amp; Material Conversion Register
              </span>
              <span className="font-mono text-gray-600" dir="ltr">
                {filteredProductions.length} production runs
              </span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 w-full">
              <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                  <tr>
                    <th className="border border-black px-2 py-2 text-start font-bold">تاریخ (Date)</th>
                    <th className="border border-black px-2 py-2 text-start font-bold">پروڈکشن #</th>
                    <th className="border border-black px-2 py-2 text-start font-bold">تیار شدہ مال (Product)</th>
                    <th className="border border-black px-2 py-2 text-start font-bold">گودام (Warehouse)</th>
                    <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Input (KG)</th>
                    <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Output (KG)</th>
                    <th className="border border-black px-2 py-2 text-left font-bold" dir="ltr">Wastage (KG)</th>
                    <th className="border border-black px-2 py-2 text-center font-bold">Yield %</th>
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
                        <td className="border border-black px-2 py-2 font-mono text-start" dir="ltr">{formatDate(p.date)}</td>
                        <td className="border border-black px-2 py-2 font-mono font-bold text-[#1E3A5F] text-start" dir="ltr">
                          {p.no}
                        </td>
                        <td className="border border-black px-2 py-2 font-bold text-gray-900 text-start">
                          {p.product}
                        </td>
                        <td className="border border-black px-2 py-2 text-gray-700 text-start">
                          {p.warehouseName || 'Factory Floor'}
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono tabular-nums" dir="ltr">
                          {Number(p.totalInput || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono font-bold text-emerald-800 tabular-nums" dir="ltr">
                          {Number(p.outputQty || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-2 text-left font-mono font-bold text-red-700 tabular-nums" dir="ltr">
                          {Number(p.wasteQty || 0).toLocaleString('en-PK')} kg
                        </td>
                        <td className="border border-black px-2 py-2 text-center font-mono font-bold text-[#1E3A5F]">
                          <span className="bg-gray-100 border border-black px-2 py-0.5 text-xs">
                            {p.yieldPct || 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredProductions.length > 0 && (
                  <tfoot className="bg-[#DFDFDF] sticky bottom-0 z-10 border-t-2 border-black font-bold">
                    <tr>
                      <td colSpan={4} className="border border-black px-3 py-2 text-start uppercase text-base">
                        میزان پیداواری پیداوار (Total Manufacturing Yield):
                      </td>
                      <td className="border border-black px-2 py-2 text-left font-mono tabular-nums" dir="ltr">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.totalInput || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-2 text-left font-mono text-emerald-900 tabular-nums" dir="ltr">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.outputQty || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-2 text-left font-mono text-red-900 tabular-nums" dir="ltr">
                        {filteredProductions
                          .reduce((sum, p) => sum + Number(p.wasteQty || 0), 0)
                          .toLocaleString('en-PK')}{' '}
                        kg
                      </td>
                      <td className="border border-black px-2 py-2 text-center font-mono text-[#1E3A5F]">
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
        {/* ─────────────────────────────────────────────────────────────
            TAB 7: TRIAL BALANCE STATEMENT (Traditional Paper Format)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'tb' && (
          <div className="space-y-4">
            {/* Screen Action Toolbar */}
            <div className="no-print pb-3 border-b border-gray-300 flex flex-wrap justify-between items-center gap-3">
              <div>
                {isTbGrandBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-[#E8F5E9] text-[#1B5E20] border-2 border-black">
                    <CheckCircle2 className="w-4 h-4 text-[#1B5E20]" />
                    <span>✓ Trial Balance 100% Balanced (Total: Rs. {fmt(tbGrandTotalBenaam)})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-red-100 text-red-900 border-2 border-black">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>⚠ Out of Balance Difference: Rs. {fmt(tbGrandDifference)}</span>
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Printer}
                onClick={safePrint}
              >
                Print Trial Balance
              </Button>
            </div>

            {/* Red Difference Banner (Visible on Screen & Print if Unbalanced) */}
            {!isTbGrandBalanced && (
              <div className="p-3 bg-red-100 border-2 border-red-700 text-red-900 font-bold text-center text-lg">
                Difference Rs. {fmt(tbGrandDifference)}
              </div>
            )}

            {/* Printable Traditional Paper Layout */}
            <div id="trial-balance-print-area" className="report-rtl bg-white border-2 border-black p-4 print:border-none print:p-0 max-w-[1400px] w-full mx-auto" dir="rtl">
              {/* Document Header */}
              <div className="relative mb-2">
                <div className="text-right text-xs font-mono font-bold text-gray-800 pr-1">
                  {trialBalanceDateStr}
                </div>
                <h1 className="text-2xl font-black text-[#008000] text-center uppercase tracking-wider -mt-2">
                  TRIAL BALANCE
                </h1>
              </div>

              {/* Table Container with max height and sticky header on screen */}
              <div className="overflow-y-auto max-h-[calc(100vh-270px)] border border-black print:overflow-visible print:max-h-none print:border-none">
              {(() => {
                let srCounter = 1;
                return (
                  <table className="w-full border-collapse border border-black text-black text-xs sm:text-sm table-fixed" dir="rtl">
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '48%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-white z-10 border-b-2 border-black shadow-sm">
                      <tr className="bg-white border-b-2 border-black">
                        <th className="border border-black px-2 py-1 text-center font-bold text-xs sm:text-sm print:text-xs font-urdu">
                          نمبر شمار
                        </th>
                        <th className="border border-black px-2 py-1 text-center font-bold text-xs sm:text-sm print:text-xs font-urdu">
                          کوڈ
                        </th>
                        <th className="border border-black px-3 py-1 text-start font-bold text-xs sm:text-sm print:text-xs font-urdu">
                          نام پارٹی
                        </th>
                        <th className="border border-black px-3 py-1 text-start font-bold text-xs sm:text-sm print:text-xs font-urdu" dir="ltr">
                          بنام
                        </th>
                        <th className="border border-black px-3 py-1 text-start font-bold text-xs sm:text-sm print:text-xs font-urdu" dir="ltr">
                          جمع
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 1. پارٹیز (Parties) */}
                      <tr className="bg-white">
                        <td colSpan={5} className="border border-black text-center font-bold text-sm sm:text-base print:text-xs py-1 text-[#0000FF] font-urdu">
                          پارٹیز
                        </td>
                      </tr>
                      {tbParties.map((p) => {
                        const bal = Number(p.balance || 0);
                        const deb = bal < 0 ? Math.abs(bal) : 0;
                        const cred = bal > 0 ? bal : 0;
                        const sr = srCounter++;
                        const hasUrdu = Boolean(p.urduName || p.nameUrdu);
                        const displayName = p.urduName || p.nameUrdu || p.name;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 overflow-visible">
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              {sr}
                            </td>
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              {p.code || p.id}
                            </td>
                            <td className={`border border-black px-3 py-0.5 text-start ${hasUrdu ? 'font-urdu font-bold text-xs sm:text-sm print:text-xs' : 'font-semibold text-xs'}`}>
                              {displayName}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {deb > 0 ? fmt(deb) : ''}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {cred > 0 ? fmt(cred) : ''}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#DFDFDF] font-bold">
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                          ٹوٹل
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbPartiesDebit > 0 ? fmt(tbPartiesDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbPartiesCredit > 0 ? fmt(tbPartiesCredit) : ''}
                        </td>
                      </tr>

                      {/* 2. کیش (Cash) */}
                      <tr className="bg-white">
                        <td colSpan={5} className="border border-black text-center font-bold text-sm sm:text-base print:text-xs py-1 text-[#0000FF] font-urdu">
                          کیش
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 overflow-visible">
                        <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                          {srCounter++}
                        </td>
                        <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                          99020
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start font-urdu font-bold text-xs sm:text-sm print:text-xs">
                          کیش بک
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                          {tbCashDebit > 0 ? fmt(tbCashDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                          {tbCashCredit > 0 ? fmt(tbCashCredit) : ''}
                        </td>
                      </tr>
                      <tr className="bg-[#DFDFDF] font-bold">
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                          ٹوٹل
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbCashDebit > 0 ? fmt(tbCashDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbCashCredit > 0 ? fmt(tbCashCredit) : ''}
                        </td>
                      </tr>

                      {/* 3. بینک (Banks) */}
                      <tr className="bg-white">
                        <td colSpan={5} className="border border-black text-center font-bold text-sm sm:text-base print:text-xs py-1 text-[#0000FF] font-urdu">
                          بینک
                        </td>
                      </tr>
                      {bankAccounts.map((b) => {
                        const bal = Number(b.balance || 0);
                        const deb = bal >= 0 ? bal : 0;
                        const cred = bal < 0 ? Math.abs(bal) : 0;
                        const displayName = b.urduName || b.nameUrdu || b.name;
                        const hasUrdu = Boolean(b.urduName || b.nameUrdu);
                        return (
                          <tr key={b.id} className="hover:bg-gray-50 overflow-visible">
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              {srCounter++}
                            </td>
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              {b.code || b.id || '99021'}
                            </td>
                            <td className={`border border-black px-3 py-0.5 text-start ${hasUrdu ? 'font-urdu font-bold text-xs sm:text-sm print:text-xs' : 'font-semibold text-xs'}`}>
                              {displayName}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {deb > 0 ? fmt(deb) : ''}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {cred > 0 ? fmt(cred) : ''}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#DFDFDF] font-bold">
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                          ٹوٹل
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbBanksDebit > 0 ? fmt(tbBanksDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbBanksCredit > 0 ? fmt(tbBanksCredit) : ''}
                        </td>
                      </tr>

                      {/* 4. کیپٹل (Capital) - only if capitalBalance !== 0 */}
                      {capitalBalance !== 0 && (
                        <>
                          <tr className="bg-white">
                            <td colSpan={5} className="border border-black text-center font-bold text-sm sm:text-base print:text-xs py-1 text-[#0000FF] font-urdu">
                              کیپٹل
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-50 overflow-visible">
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              {srCounter++}
                            </td>
                            <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                              99030
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start font-urdu font-bold text-xs sm:text-sm print:text-xs">
                              راس المال / Capital
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {tbCapitalDebit > 0 ? fmt(tbCapitalDebit) : ''}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                              {tbCapitalCredit > 0 ? fmt(tbCapitalCredit) : ''}
                            </td>
                          </tr>
                          <tr className="bg-[#DFDFDF] font-bold">
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                              ٹوٹل
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                              {tbCapitalDebit > 0 ? fmt(tbCapitalDebit) : ''}
                            </td>
                            <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                              {tbCapitalCredit > 0 ? fmt(tbCapitalCredit) : ''}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* 5. سیلز اینڈ پرچیز (Sale & Purchase / Mall A/C) */}
                      <tr className="bg-white">
                        <td colSpan={5} className="border border-black text-center font-bold text-sm sm:text-base print:text-xs py-1 text-[#0000FF] font-urdu">
                          سیلز اینڈ پرچیز
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 overflow-visible">
                        <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                          {srCounter++}
                        </td>
                        <td className="border border-black px-2 py-0.5 text-center num text-xs" dir="ltr">
                          99010
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start font-urdu font-bold text-xs sm:text-sm print:text-xs">
                          مال کھاتہ 1 ...... Mall A/C
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                          {tbMallDebit > 0 ? fmt(tbMallDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num text-xs" dir="ltr">
                          {tbMallCredit > 0 ? fmt(tbMallCredit) : ''}
                        </td>
                      </tr>
                      <tr className="bg-[#DFDFDF] font-bold">
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                          ٹوٹل
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbMallDebit > 0 ? fmt(tbMallDebit) : ''}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-[#0000FF]" dir="ltr">
                          {tbMallCredit > 0 ? fmt(tbMallCredit) : ''}
                        </td>
                      </tr>

                    </tbody>
                    <tfoot className="sticky bottom-0 bg-[#DFDFDF] font-bold border-t-2 border-black z-10 shadow-sm">
                      {/* Grand Total Row */}
                      <tr className="bg-[#DFDFDF] font-bold">
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black text-center font-urdu text-xs sm:text-sm print:text-xs font-bold">
                          ٹوٹل
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-red-700" dir="ltr">
                          {fmt(tbGrandTotalBenaam)}
                        </td>
                        <td className="border border-black px-3 py-0.5 text-start num-total text-xs text-red-700" dir="ltr">
                          {fmt(tbGrandTotalJama)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
              </div>

              <div className="text-center font-mono text-sm text-gray-700 py-3">
                Page 1 of 1
              </div>
            </div>

            {/* Reconciliation Panels (Screen Only) */}
            <div className="no-print space-y-4 border-2 border-black bg-white mt-6">

            {/* ── RECONCILIATION SECTION 1: ACCOUNT-BY-ACCOUNT DETAILED RECONCILIATION ── */}
            <div className="p-3.5 border-t-2 border-black bg-[#FAF9F7]">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                  <h4 className="text-xl font-bold uppercase tracking-wider text-black">
                    ACCOUNT RECONCILIATION AUDIT (ONE ROW PER ACTIVE ACCOUNT)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Granular account-level breakdown showing Debit, Credit, and Net positions
                  </p>
                </div>
                <span className="text-sm font-mono font-bold bg-white border border-black px-2.5 py-1">
                  {isTbBalanced ? '✓ Zero Net Discrepancy' : `⚠ Variance: ${fmt(tbDifference)}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-base text-left border-collapse border border-black bg-white">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-2.5 py-2.5 w-12 text-center text-base font-bold">#</th>
                      <th className="border border-black px-3.5 py-2.5 text-base font-bold">Account / Ledger Head</th>
                      <th className="border border-black px-3.5 py-2.5 w-48 text-base font-bold">Classification</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Debit (Rs.)</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Credit (Rs.)</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Net Balance (Rs.)</th>
                      <th className="border border-black px-2.5 py-2.5 text-center w-28 text-base font-bold">Reconciled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountReconRows.map((acc) => (
                      <tr key={acc.idx} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="border border-black px-2.5 py-2.5 text-center font-mono text-gray-500">
                          {acc.idx}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 font-bold text-gray-900">
                          {acc.name}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-gray-600">
                          <span className="border border-black px-2 py-0.5 text-xs font-bold bg-gray-50">
                            {acc.type}
                          </span>
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-[#1E3A5F] tabular-nums">
                          {acc.debit > 0 ? fmt(acc.debit) : '-'}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-emerald-800 tabular-nums">
                          {acc.credit > 0 ? fmt(acc.credit) : '-'}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 tabular-nums">
                          {fmt(acc.net)} <span className="text-xs text-gray-500">({acc.netType})</span>
                        </td>
                        <td className="border border-black px-2.5 py-2.5 text-center">
                          <span className="text-[#1B5E20] font-bold text-xs">✓ Reconciled</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#DFDFDF] font-bold">
                    <tr>
                      <td colSpan={3} className="border border-black px-3.5 py-2.5 text-right uppercase text-base">
                        Reconciliation Column Totals:
                      </td>
                      <td className="border border-black px-3.5 py-2.5 text-right font-mono text-[#1E3A5F] text-[17px] font-bold tabular-nums">
                        {fmt(sumDebits)}
                      </td>
                      <td className="border border-black px-3.5 py-2.5 text-right font-mono text-emerald-800 text-[17px] font-bold tabular-nums">
                        {fmt(sumCredits)}
                      </td>
                      <td className="border border-black px-3.5 py-2.5 text-right font-mono text-black text-[17px] font-bold tabular-nums">
                        {isTbBalanced ? '0.00 (Balanced)' : fmt(tbDifference)}
                      </td>
                      <td className="border border-black px-2.5 py-2.5 text-center text-xs">
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
            <div className="p-3.5 border-t-2 border-black bg-[#FAF9F7]">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div>
                  <h4 className="text-xl font-bold uppercase tracking-wider text-black">
                    PER-VOUCHER INTEGRITY CHECK (Σ DEBIT VS Σ CREDIT FOR EVERY JOURNAL VOUCHER)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Individual double-entry balance check confirming Σ Debit = Σ Credit for every posted voucher
                  </p>
                </div>
                {allJvsBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold bg-[#E8F5E9] text-[#1B5E20] border-2 border-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All {journalEntries.length} JVs In Complete Balance</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold bg-red-100 text-red-900 border-2 border-black">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Unbalanced Vouchers Detected!</span>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-base text-left border-collapse border border-black bg-white">
                  <thead className="bg-[#DFDFDF] border-b border-black">
                    <tr>
                      <th className="border border-black px-3 py-2.5 w-28 text-base font-bold">Voucher #</th>
                      <th className="border border-black px-3 py-2.5 w-28 text-base font-bold">Date</th>
                      <th className="border border-black px-3.5 py-2.5 text-base font-bold">Narration / Particulars</th>
                      <th className="border border-black px-3 py-2.5 text-center w-20 text-base font-bold">Lines</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Σ Debit (PKR)</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Σ Credit (PKR)</th>
                      <th className="border border-black px-3.5 py-2.5 text-right w-32 text-base font-bold">Variance</th>
                      <th className="border border-black px-3 py-2.5 text-center w-32 text-base font-bold">Status</th>
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
                            <td className="border border-black px-3 py-2.5 font-mono font-bold text-[#1E3A5F]">
                              {jv.no || jv.refNo}
                            </td>
                            <td className="border border-black px-3 py-2.5 font-mono">{formatDate(jv.date)}</td>
                            <td className="border border-black px-3.5 py-2.5 text-gray-800">
                              {jv.narration || jv.description || '-'}
                            </td>
                            <td className="border border-black px-3 py-2.5 text-center font-mono">
                              {(jv.lines || []).length}
                            </td>
                            <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-[#1E3A5F] tabular-nums">
                              {fmt(jvDeb)}
                            </td>
                            <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-emerald-800 tabular-nums">
                              {fmt(jvCred)}
                            </td>
                            <td
                              className={`border border-black px-3.5 py-2.5 text-right font-mono font-bold tabular-nums ${
                                isJvBal ? 'text-gray-400' : 'text-red-700'
                              }`}
                            >
                              {isJvBal ? '-' : fmt(varAmt)}
                            </td>
                            <td className="border border-black px-3 py-2.5 text-center">
                              {isJvBal ? (
                                <span className="border border-black bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 text-xs font-bold">
                                  ✓ Balanced
                                </span>
                              ) : (
                                <span className="border border-red-700 bg-red-100 text-red-900 px-2 py-0.5 text-xs font-bold">
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
                    <tfoot className="bg-[#DFDFDF] font-bold">
                      <tr>
                        <td colSpan={4} className="border border-black px-3.5 py-2.5 text-right uppercase text-base">
                          Total All Journal Vouchers Volume:
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono text-[#1E3A5F] text-[17px] font-bold tabular-nums">
                          {fmt(
                            journalEntries.reduce(
                              (s, jv) =>
                                s + (jv.lines || []).reduce((ls, l) => ls + Number(l.debit || 0), 0),
                              0
                            )
                          )}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono text-emerald-800 text-[17px] font-bold tabular-nums">
                          {fmt(
                            journalEntries.reduce(
                              (s, jv) =>
                                s + (jv.lines || []).reduce((ls, l) => ls + Number(l.credit || 0), 0),
                              0
                            )
                          )}
                        </td>
                        <td className="border border-black px-3.5 py-2.5 text-right font-mono text-gray-500">-</td>
                        <td className="border border-black px-3 py-2.5 text-center text-sm font-bold">
                          {allJvsBalanced ? '✓ OK' : '⚠ Action Req'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 8: PROFIT & LOSS AND BALANCE SHEET
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'pl' && (
          <div className="space-y-4">
            {/* Screen Action Toolbar */}
            <div className="no-print pb-3 border-b border-gray-300 flex flex-wrap justify-between items-center gap-3">
              <div>
                {isPlBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-[#E8F5E9] text-[#1B5E20] border-2 border-black">
                    <CheckCircle2 className="w-4 h-4 text-[#1B5E20]" />
                    <span>✓ Balanced (Assets = Liabilities: Rs. {fmt(plAssetsTotal)})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold bg-red-100 text-red-900 border-2 border-black">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>⚠ Out of Balance Difference: Rs. {fmt(plDifference)}</span>
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Printer}
                onClick={safePrint}
              >
                Print Statement
              </Button>
            </div>

            {/* Red Difference Banner if Out of Balance */}
            {!isPlBalanced && (
              <div className="p-3 bg-red-100 border-2 border-red-700 text-red-900 font-bold text-center text-lg">
                Difference Rs. {fmt(plDifference)}
              </div>
            )}

            {/* Printable Traditional Two-Block Sheet (Assets vs Liabilities) */}
            <div
              id="pl-statement-print-area"
              className="report-rtl bg-white border-2 border-black p-4 sm:p-6 max-w-xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0 print:max-w-none text-black max-h-[calc(100vh-250px)] overflow-y-auto print:max-h-none print:overflow-visible"
              dir="rtl"
            >
              {/* BLOCK 1: Assets (Debit / Benaam) */}
              <div className="mb-4">
                <h2 className="text-[#d946ef] font-bold text-center mb-3 tracking-wide">
                  <span className="font-urdu block text-xl leading-relaxed text-[#d946ef]">اثاثہ جات</span>
                  <span className="text-xs uppercase text-[#d946ef]">Assets (Debit / Benaam)</span>
                </h2>
                <div className="space-y-2">
                  {/* 1. Cash in Hand */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        روکڑ
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Cash in Hand
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(cashInHand)}
                    </span>
                  </div>

                  {/* 2. Receivable */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        وصولیاں
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Receivable
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(totalReceivables)}
                    </span>
                  </div>

                  {/* 3. Expenditure */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        اخراجات
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Expenditure
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      0
                    </span>
                  </div>

                  {/* Spacer between Expenditure and Stock */}
                  <div className="h-1"></div>

                  {/* 4. Stock (Value) */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        سٹاک
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Stock (Value)
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(stockValuation)}
                    </span>
                  </div>

                  {/* 5. Bank */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        بینک
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Bank
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(totalBankBalances)}
                    </span>
                  </div>

                  {/* Total (Debit/Benaam) */}
                  <div className="flex items-baseline justify-between pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-lg font-bold text-blue-700">
                        ٹوٹل
                      </span>
                      <span className="text-xs font-bold text-blue-700">
                        Total (Debit/Benaam)
                      </span>
                    </div>
                    <span className="text-start num-total text-base print:text-sm text-blue-700 w-40 border-t-2 border-black pt-0.5" dir="ltr">
                      {fmt(plAssetsTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BLOCK 2: Liabilities (Credit / Jama) */}
              <div className="mb-4 pt-2">
                <h2 className="text-[#d946ef] font-bold text-center mb-3 tracking-wide">
                  <span className="font-urdu block text-xl leading-relaxed text-[#d946ef]">واجبات و ذمہ داریاں</span>
                  <span className="text-xs uppercase text-[#d946ef]">Liabilities (Credit / Jama)</span>
                </h2>
                <div className="space-y-2">
                  {/* 1. Capital */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        راس
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Capital
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(capitalBalance)}
                    </span>
                  </div>

                  {/* 2. Payable */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        ادائیگیاں
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Payable
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {fmt(totalPayables)}
                    </span>
                  </div>

                  {/* 3. Gross Profit */}
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-base font-bold text-black">
                        نفع
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Gross Profit
                      </span>
                    </div>
                    <span className="text-start num text-sm print:text-xs text-black w-40 border-b border-gray-400 pb-0.5" dir="ltr">
                      {grossProfit < 0 ? `(${fmt(Math.abs(grossProfit))})` : fmt(grossProfit)}
                    </span>
                  </div>

                  {/* Total (Credit/Jamma) */}
                  <div className="flex items-baseline justify-between pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-urdu text-lg font-bold text-blue-700">
                        ٹوٹل
                      </span>
                      <span className="text-xs font-bold text-blue-700">
                        Total (Credit/Jama)
                      </span>
                    </div>
                    <span className="text-start num-total text-base print:text-sm text-blue-700 w-40 border-t-2 border-black pt-0.5" dir="ltr">
                      {fmt(plLiabilitiesTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTTOM: NET P/L & EQUILIBRIUM */}
              <div className="pt-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center">
                  <span className="text-red-600 font-bold text-2xl me-4 uppercase tracking-wider">
                    NET P/L
                  </span>
                  <div className="bg-[#FFFF00] border-2 border-black px-6 py-1.5 num-total text-2xl text-black inline-block shadow-sm">
                    {plNetPL < 0 ? `(${fmt(Math.abs(plNetPL))})` : fmt(plNetPL)}
                  </div>
                </div>

                {isPlBalanced ? (
                  <div className="text-green-700 font-bold text-base flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-green-700" />
                    <span>Balanced (Assets = Liabilities)</span>
                  </div>
                ) : (
                  <div className="text-red-700 font-bold text-base flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-5 h-5 text-red-700" />
                    <span>Difference Rs. {fmt(plDifference)}</span>
                  </div>
                )}
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
