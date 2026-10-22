import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import MallAcStatement from '../../components/common/MallAcStatement.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { safePrint } from '../../utils/printUtils.js';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { salePurchaseService } from '../../services/salePurchaseService.js';
import { purchaseService } from '../../services/purchaseService.js';
import { saleService } from '../../services/saleService.js';
import { expenseService } from '../../services/expenseService.js';
import { journalService } from '../../services/journalService.js';
import { cashService } from '../../services/cashService.js';
import { issueService } from '../../services/issueService.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useApp } from '../../context/AppContext.jsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database.js';
import { fmt, formatDate } from '../../utils/formatters.js';
import { balanceSide } from '../../utils/partySide.js';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  MinusCircle,
  Printer,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function SalePurchaseLedger() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { expenses } = useFinances();
  const { issues } = useIssues();
  const journalEntries = useLiveQuery(() => (db.journalEntries ? db.journalEntries.toArray() : []), []) || [];
  const cashBookEntries = useLiveQuery(() => (db.cashBookEntries ? db.cashBookEntries.toArray() : []), []) || [];

  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    jvAdjustments: 0,
    cashBookAdjustments: 0,
    netBalance: 0,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deletingItem, setDeletingItem] = useState(null);

  const loadData = async () => {
    const data = await salePurchaseService.getLedger();
    const sum = await salePurchaseService.getSummary();
    setLedger(data);
    setSummary(sum);
  };

  useEffect(() => {
    loadData();
  }, [purchases, sales, expenses, issues, journalEntries.length, cashBookEntries.length]);

  // Compute opening balance before dateFrom (if dateFrom filter is active)
  const openingBalanceBeforeDateFrom = useMemo(() => {
    if (!dateFrom) return 0;
    return ledger
      .filter((item) => item.date < dateFrom)
      .reduce((sum, item) => sum + (Number(item.credit) || 0) - (Number(item.debit) || 0), 0);
  }, [ledger, dateFrom]);

  // Filter ledger rows by search, category, and date range
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger.filter((item) => {
      const matchSearch =
        !q ||
        (item.no && item.no.toLowerCase().includes(q)) ||
        (item.partyName && item.partyName.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'PURCHASE' && (item.category === 'Purchase' || item.head === 'Purchase')) ||
        (categoryFilter === 'SALE' && (item.category === 'Sale' || item.head === 'Sale')) ||
        (categoryFilter === 'EXPENSE' && item.category === 'Expense') ||
        (categoryFilter === 'JOURNAL' && item.category === 'Journal') ||
        (categoryFilter === 'CASHBOOK' && item.category === 'CashBook') ||
        (categoryFilter === 'ISSUE' && item.category === 'Issue');

      const matchFrom = !dateFrom || item.date >= dateFrom;
      const matchTo = !dateTo || item.date <= dateTo;

      return matchSearch && matchCategory && matchFrom && matchTo;
    });
  }, [ledger, search, categoryFilter, dateFrom, dateTo]);

  // Compute progressive running balance for filtered rows strictly from running balance
  let runningAcc = openingBalanceBeforeDateFrom;
  let totalCredit = openingBalanceBeforeDateFrom > 0 ? openingBalanceBeforeDateFrom : 0;
  let totalDebit = openingBalanceBeforeDateFrom < 0 ? Math.abs(openingBalanceBeforeDateFrom) : 0;

  const rowsWithRunningBalance = filtered.map((r) => {
    const cr = Number(r.credit || 0);
    const dr = Number(r.debit || 0);
    totalCredit += cr;
    totalDebit += dr;
    runningAcc += cr - dr;
    return {
      ...r,
      runningBalance: runningAcc,
    };
  });

  const closingBalance =
    rowsWithRunningBalance.length > 0
      ? rowsWithRunningBalance[rowsWithRunningBalance.length - 1].runningBalance
      : openingBalanceBeforeDateFrom;

  const closingSide = balanceSide(closingBalance);

  const handlePrint = () => {
    safePrint();
  };

  const handleRowClick = (row) => {
    if (!row) return;
    if (row.category === 'Sale') {
      navigate('/sale');
    } else if (row.category === 'Purchase') {
      navigate('/purchase');
    } else if (row.category === 'Expense') {
      navigate('/expenses');
    } else if (row.category === 'Journal') {
      navigate('/journal');
    } else if (row.category === 'CashBook') {
      navigate('/cash-book');
    } else if (row.category === 'Issue') {
      navigate('/issue');
    }
  };

  const handleEdit = (row, e) => {
    if (e) e.stopPropagation();
    handleRowClick(row);
  };

  const handleDeleteClick = (row, e) => {
    if (e) e.stopPropagation();
    setDeletingItem(row);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.category === 'Purchase') {
        await purchaseService.delete(deletingItem.rawId);
      } else if (deletingItem.category === 'Sale') {
        await saleService.delete(deletingItem.rawId);
      } else if (deletingItem.category === 'Expense') {
        await expenseService.delete(deletingItem.rawId);
      } else if (deletingItem.category === 'Journal') {
        await journalService.delete(deletingItem.rawId);
      } else if (deletingItem.category === 'CashBook') {
        await cashService.deleteCashBookEntry(deletingItem.rawId);
      } else if (deletingItem.category === 'Issue') {
        await issueService.delete(deletingItem.rawId);
      }
      showToast(`${deletingItem.no || 'Voucher'} deleted successfully!`);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setDeletingItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Purchase A/C (Mall A/C)"
        subtitle="Single controlling account for Goods Purchases (Mal Kharid), Goods Sales (Mal Farokht), and Operating Expenses"
        actions={
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print Statement (پرنٹ)
          </Button>
        }
      />

      {/* Filter Bar — screen only */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3] no-print">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoice #, party, category..."
            className="w-full sm:w-72"
          />
          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Transactions' },
                { value: 'PURCHASE', label: 'Purchases (Mal Kharid)' },
                { value: 'SALE', label: 'Sales (Mal Farokht)' },
                { value: 'EXPENSE', label: 'Operating Expenses' },
                { value: 'JOURNAL', label: 'Journal Adjustments' },
                { value: 'CASHBOOK', label: 'Cash Book (Roznamcha)' },
                { value: 'ISSUE', label: 'Material Issues' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          {(dateFrom || dateTo || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setCategoryFilter('ALL');
              }}
              className="text-xs text-red-600 underline font-semibold hover:text-red-800 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Centered Bordered Party / Account Name Box ── */}
      <div className="border-2 border-black p-2 text-center bg-white shadow-sm rounded-none my-2">
        <div className="font-urdu font-bold text-2xl print:text-xl text-black leading-tight" dir="rtl">
          مال کھاتہ (سیلز اینڈ پرچیز)
        </div>
        <div className="font-bold text-sm print:text-xs text-black mt-0.5" dir="ltr">
          Mall Account (Sale & Purchase Ledger)
        </div>
        <div className="text-xs print:text-[10px] font-semibold text-gray-800 mt-0.5 flex items-center justify-center gap-6" dir="rtl">
          <span>کوڈ: <strong className="num text-xs">99010 (MALL-AC)</strong></span>
          <span>
            سابقہ بیلنس: <strong className="num text-xs" style={{ color: balanceSide(openingBalanceBeforeDateFrom).color }}>
              {openingBalanceBeforeDateFrom === 0
                ? '0'
                : `${fmt(Math.abs(openingBalanceBeforeDateFrom))} ${balanceSide(openingBalanceBeforeDateFrom).ur}`}
            </strong>
          </span>
        </div>
      </div>

      {/* ── PRINT VIEW — MallAcStatement (PERBALACC bordered grid) ────────── */}
      <MallAcStatement
        ledgerRows={filtered}
        openingBalance={openingBalanceBeforeDateFrom}
        dateFrom={dateFrom}
        dateTo={dateTo}
        acCode="99010 (MALL-AC)"
        accountName="Mall Account (Sale & Purchase Ledger)"
        urduName="مال کھاتہ (سیلز اینڈ پرچیز)"
      />

      {/* ── SCREEN VIEW ──────────────────────────────────────────────────── */}
      <div className="space-y-6 no-print">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Purchases"
            value={fmt(summary.totalPurchases)}
            sub="Goods Inward Cost"
            icon={TrendingDown}
            color="text-red-600"
          />
          <StatCard
            label="Total Sales"
            value={fmt(summary.totalSales)}
            sub="Goods & Services Revenue"
            icon={TrendingUp}
            color="text-emerald-600"
          />
          <StatCard
            label="Operating Expenses"
            value={fmt(summary.totalExpenses)}
            sub="Labour, Utilities, Rent"
            icon={MinusCircle}
            color="text-amber-600"
          />
          <StatCard
            label="Journal Adjustments"
            value={fmt(summary.jvAdjustments || 0)}
            sub="JV Mall & Exp lines"
            icon={Scale}
            color={(summary.jvAdjustments || 0) >= 0 ? 'text-[#1E3A5F]' : 'text-red-600'}
          />
          <StatCard
            label="Mall A/C Net Position"
            value={fmt(summary.netBalance)}
            sub="Sales − Purchases − Exp + JV"
            icon={Scale}
            color={summary.netBalance >= 0 ? 'text-[#1E3A5F]' : 'text-red-600'}
          />
        </div>

        {/* Ledger Table */}
        <div className="report-rtl max-w-[1400px] w-full mx-auto" dir="rtl">
          <div className="overflow-x-auto border-2 border-black bg-white">
            <table className="w-full border-collapse text-xs sm:text-sm text-black" dir="rtl">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black font-bold">
                  <th className="border border-black px-2 py-2 text-center w-24 font-urdu">تاریخ</th>
                  <th className="border border-black px-2 py-2 text-center w-28 font-urdu">واؤچر نمبر</th>
                  <th className="border border-black px-3 py-2 text-start font-urdu">تفصیل</th>
                  <th className="border border-black px-3 py-2 text-start w-28 font-urdu" dir="ltr">جمع</th>
                  <th className="border border-black px-3 py-2 text-start w-28 font-urdu" dir="ltr">بنام</th>
                  <th className="border border-black px-3 py-2 text-start w-36 font-urdu" dir="ltr">بیلنس</th>
                  <th className="border border-black px-2 py-2 text-center w-20 font-urdu no-print">ایکشن</th>
                </tr>
              </thead>

              <tbody>
                {/* Opening balance row at the top if date range filter is active */}
                {dateFrom && (
                  <tr className="bg-amber-50/70 border-b border-black font-bold">
                    <td className="border border-black px-2 py-1.5 text-center font-mono num" dir="ltr">
                      {formatDate(dateFrom)}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center font-mono text-gray-500">—</td>
                    <td className="border border-black px-3 py-1.5 text-start font-urdu">
                      <div className="font-bold text-sm text-amber-900">سابقہ بیلنس (Opening Balance)</div>
                      <div className="text-[11px] text-gray-600">بیلنس تا {formatDate(dateFrom)}</div>
                    </td>
                    <td className="border border-black px-3 py-1.5 text-start num text-emerald-700 font-bold" dir="ltr">
                      {openingBalanceBeforeDateFrom > 0 ? fmt(openingBalanceBeforeDateFrom) : '—'}
                    </td>
                    <td className="border border-black px-3 py-1.5 text-start num text-red-700 font-bold" dir="ltr">
                      {openingBalanceBeforeDateFrom < 0 ? fmt(Math.abs(openingBalanceBeforeDateFrom)) : '—'}
                    </td>
                    <td
                      className="border border-black px-3 py-1.5 text-start num-total font-extrabold whitespace-nowrap"
                      dir="ltr"
                      style={{ color: balanceSide(openingBalanceBeforeDateFrom).color }}
                    >
                      <span>{fmt(Math.abs(openingBalanceBeforeDateFrom))}</span>
                      {balanceSide(openingBalanceBeforeDateFrom).ur && (
                        <span className="font-urdu font-bold text-xs ms-1.5">
                          {balanceSide(openingBalanceBeforeDateFrom).ur}
                        </span>
                      )}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center no-print"></td>
                  </tr>
                )}

                {/* Empty State */}
                {rowsWithRunningBalance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500 font-urdu text-base border border-black">
                      اس مدت میں کوئی لین دین درج نہیں ہے۔ (No transactions posted to Mall A/C)
                    </td>
                  </tr>
                )}

                {/* Data Rows */}
                {rowsWithRunningBalance.map((r, idx) => {
                  const side = balanceSide(r.runningBalance);
                  const isOpeningRow = r.isOpening;

                  let badgeColor = 'bg-gray-100 text-gray-800';
                  if (r.category === 'Sale' || r.head === 'Sale') badgeColor = 'bg-emerald-100 text-emerald-800';
                  else if (r.category === 'Purchase' || r.head === 'Purchase') badgeColor = 'bg-orange-100 text-orange-800';
                  else if (r.category === 'Journal') badgeColor = 'bg-blue-100 text-blue-800';
                  else if (r.category === 'CashBook') badgeColor = r.credit > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
                  else if (r.category === 'Expense') badgeColor = 'bg-amber-100 text-amber-800';

                  return (
                    <tr
                      key={r.id || idx}
                      onClick={() => handleRowClick(r)}
                      className={`hover:bg-blue-50/60 cursor-pointer border-b border-black transition-colors ${
                        isOpeningRow ? 'bg-amber-50/40' : idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                      }`}
                      title="Click to view source voucher"
                    >
                      {/* 1. Date */}
                      <td className="border border-black px-2 py-1.5 text-center font-mono num whitespace-nowrap text-xs" dir="ltr">
                        {formatDate(r.date)}
                      </td>

                      {/* 2. Voucher No */}
                      <td className="border border-black px-2 py-1.5 text-center font-mono font-bold text-[#1E3A5F] text-xs whitespace-nowrap" dir="ltr">
                        {r.no}
                      </td>

                      {/* 3. Detail (Party name + item/narration) */}
                      <td className="border border-black px-3 py-1.5 text-start">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase rounded ${badgeColor}`}>
                            {r.category || r.type}
                          </span>
                          <span className="font-urdu font-bold text-sm text-gray-900">
                            {r.partyName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 truncate max-w-md mt-0.5" title={r.description}>
                          {r.description || '—'}
                        </div>
                      </td>

                      {/* 4. Jama (Credit) */}
                      <td className="border border-black px-3 py-1.5 text-start num text-emerald-700 font-bold whitespace-nowrap" dir="ltr">
                        {r.credit > 0 ? fmt(r.credit) : '—'}
                      </td>

                      {/* 5. Benaam (Debit) */}
                      <td className="border border-black px-3 py-1.5 text-start num text-red-700 font-bold whitespace-nowrap" dir="ltr">
                        {r.debit > 0 ? fmt(r.debit) : '—'}
                      </td>

                      {/* 6. Running Balance with Side Marker (from running balance only) */}
                      <td
                        className="border border-black px-3 py-1.5 text-start num-total font-extrabold whitespace-nowrap"
                        dir="ltr"
                        style={{ color: side.color }}
                      >
                        <span>{fmt(Math.abs(r.runningBalance))}</span>
                        {side.ur && (
                          <span className="font-urdu font-bold text-xs ms-1.5 px-1 py-0.5 rounded border border-current text-[11px]">
                            {side.ur}
                          </span>
                        )}
                      </td>

                      {/* 7. Action Icons (Edit / Delete) */}
                      <td className="border border-black px-2 py-1.5 text-center no-print" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleEdit(r, e)}
                            className="p-1 border border-black/40 hover:bg-amber-100 text-amber-800 bg-white cursor-pointer transition-colors"
                            title="Edit source voucher"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(r, e)}
                            className="p-1 border border-black/40 hover:bg-red-100 text-red-800 bg-white cursor-pointer transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Closing Balance Row at the Bottom ── */}
              <tfoot className="border-t-2 border-black bg-[#DFDFDF] font-bold">
                <tr className="border-t-2 border-black">
                  <td className="border border-black px-2 py-2 text-center font-mono text-xs" dir="ltr">—</td>
                  <td className="border border-black px-2 py-2 text-center font-mono text-xs text-gray-600">—</td>
                  <td className="border border-black px-3 py-2 text-start font-urdu font-bold text-sm">
                    میزان کل و اختتامی بیلنس (Closing Balance)
                  </td>
                  <td className="border border-black px-3 py-2 text-start num-total text-xs text-emerald-800 font-extrabold whitespace-nowrap" dir="ltr">
                    {totalCredit > 0 ? fmt(totalCredit) : '0'}
                  </td>
                  <td className="border border-black px-3 py-2 text-start num-total text-xs text-red-800 font-extrabold whitespace-nowrap" dir="ltr">
                    {totalDebit > 0 ? fmt(totalDebit) : '0'}
                  </td>
                  <td
                    className="border border-black px-3 py-2 text-start num-total text-xs font-extrabold whitespace-nowrap"
                    dir="ltr"
                    style={{ color: closingSide.color }}
                  >
                    <span>{fmt(Math.abs(closingBalance))}</span>
                    {closingSide.ur && (
                      <span className="font-urdu font-bold text-xs ms-1.5 px-1 py-0.5 rounded border border-current text-[11px]">
                        {closingSide.ur}
                      </span>
                    )}
                  </td>
                  <td className="border border-black px-2 py-2 text-center no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        title="Delete Transaction"
        message={`Are you sure you want to delete ${deletingItem?.no || 'this transaction'} (${deletingItem?.type || deletingItem?.category})? This will reverse the transaction and update account balances.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}
