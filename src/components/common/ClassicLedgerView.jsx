import React from 'react';
import { Printer } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { fmt, fmtNum, formatDate } from '../../utils/formatters.js';

function fmtDateShort(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function fmtDateUpper(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dd = String(dt.getDate()).padStart(2, '0');
  const mmm = months[dt.getMonth()];
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}-${mmm}-${yy}`;
}

function fmtTimestamp() {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dd = String(now.getDate()).padStart(2, '0');
  const mmm = months[now.getMonth()];
  const yy = String(now.getFullYear()).slice(-2);
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const hh = String(h).padStart(2, '0');
  return `${dd}-${mmm}-${yy} ${hh}:${m} ${ampm}`;
}

const BORDER_STYLE = '1px solid #000000';

export default function ClassicLedgerView({
  accountType = 'Customer', // 'Customer' | 'Supplier' | 'Warehouse' | 'Quality' | 'Item'
  acCode = '10051',
  accountName = '',
  badgeText = 'خریدار',
  rows = [], // [{ id, date, billNo, detail, quantity, weight, rate, debit, credit, balance, marker, ... }]
  openingBalance = 0,
  dateFrom = '',
  setDateFrom = null,
  dateTo = '',
  setDateTo = null,
  entitySelector = null,
  onRowClick = null,
  mode = 'currency', // 'currency' | 'quantity'
  unitLabel = 'Rs',
  className = '',
}) {
  const timestamp = fmtTimestamp();

  // Filter rows by date if set
  const filteredRows = rows.filter((r) => {
    if (!r.date) return true;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  // Calculate live totals
  const totalDebit = filteredRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const totalQty = filteredRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalWeight = filteredRows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const finalBalance =
    filteredRows.length > 0 ? Number(filteredRows[filteredRows.length - 1].balance || 0) : openingBalance;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Controls: Entity Selector and Print Action (Hidden on paper) */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-[#FAF9F7] p-3 rounded-xl border border-[#E0DBD3]">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {entitySelector}
        </div>
        <Button variant="primary" icon={Printer} onClick={handlePrint}>
          Print Statement
        </Button>
      </div>

      {/* Main Classic "PERBALACC" Statement Container */}
      <div
        id="classic-ledger-print-area"
        className="bg-white print-area p-4 sm:p-6 border border-gray-400 shadow-sm font-sans text-black overflow-x-auto print:p-0 print:border-none print:shadow-none"
        style={{
          minWidth: '780px',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          color: '#000000',
        }}
      >
        {/* Header Block */}
        <div className="mb-3 space-y-1.5 border-b border-black pb-3">
          {/* Top Line: Timestamp, Title, Account Badge */}
          <div className="flex items-start justify-between">
            {/* Top-left: Live timestamp */}
            <div className="text-[11px] font-mono text-gray-700 w-1/4">
              {timestamp}
            </div>

            {/* Center: STATEMENT OF ACCOUNT */}
            <div className="text-center w-2/4">
              <h1 className="text-xl sm:text-2xl font-black text-[#1a6b2e] tracking-wider uppercase">
                STATEMENT OF ACCOUNT
              </h1>
            </div>

            {/* Top-right: Account Name & Yellow Badge */}
            <div className="flex items-center justify-end gap-2 w-1/4">
              <span className="text-sm font-bold text-[#0d47a1] font-serif" dir="rtl">
                {accountName}
              </span>
              <div className="bg-[#FFEB3B] border border-black px-3 py-0.5 text-xs font-bold text-red-900 shadow-xs">
                {badgeText}
              </div>
            </div>
          </div>

          {/* Second Line: A/C Code, Account Name, Period Date Range Filter */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
            <div className="font-bold flex items-center gap-2">
              <span>A/C Code </span>
              <span className="font-mono text-sm font-extrabold bg-gray-100 px-1.5 py-0.5 border border-black/40">{acCode}</span>
              {accountName && (
                <span className="text-[#0d47a1] font-serif text-sm font-bold ml-1">
                  — {accountName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-medium text-xs">
              <span className="font-bold">A/C Ledger for the period From</span>
              {/* Screen editable date inputs */}
              <div className="print:hidden flex items-center gap-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom && setDateFrom(e.target.value)}
                  className="border border-black px-1.5 py-0.5 font-mono text-xs bg-white outline-none cursor-pointer"
                  title="Filter start date"
                />
                <span className="font-bold">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo && setDateTo(e.target.value)}
                  className="border border-black px-1.5 py-0.5 font-mono text-xs bg-white outline-none cursor-pointer"
                  title="Filter end date"
                />
              </div>
              {/* Print view boxed dates matching reference format e.g. 01-MAR-22 To 03-OCT-26 */}
              <div className="hidden print:inline-flex items-center gap-1.5">
                <span className="border border-black px-2 py-0.5 font-mono text-xs font-bold">
                  {dateFrom ? fmtDateUpper(dateFrom) : filteredRows[0]?.date ? fmtDateUpper(filteredRows[0].date) : 'START'}
                </span>
                <span className="font-bold">To</span>
                <span className="border border-black px-2 py-0.5 font-mono text-xs font-bold">
                  {dateTo ? fmtDateUpper(dateTo) : fmtDateUpper(new Date())}
                </span>
              </div>
            </div>
          </div>

          {/* Third Line: Opening Balance (سابقہ بقایا) */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" dir="rtl">سابقہ بقایا</span>
              <span className="font-mono font-bold text-sm">
                {openingBalance ? (mode === 'currency' ? fmt(openingBalance) : `${fmtNum(openingBalance)} ${unitLabel}`) : '0'}
              </span>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-[11px] text-gray-500 font-mono">
                Showing {filteredRows.length} transaction entries
              </span>
            )}
          </div>
        </div>

        {/* ── Main Ledger Grid (PERBALACC Exact Bordered Table) ── */}
        <table
          className="w-full border-collapse text-xs text-black"
          style={{
            borderCollapse: 'collapse',
            border: BORDER_STYLE,
            tableLayout: 'fixed',
          }}
        >
          {/* Column definitions matching reference proportions:
              Physical Left-to-Right: [marker] | بقایا | جمع | بنام | ریٹ | وزن | تعداد | بل | تفصیل | تاریخ
          */}
          <colgroup>
            <col style={{ width: '4%' }} />  {/* Marker: جمع/نام */}
            <col style={{ width: '13%' }} /> {/* بقایا: Balance */}
            <col style={{ width: '13%' }} /> {/* جمع: Credit / Total */}
            <col style={{ width: '13%' }} /> {/* بنام: Debit / Counterparty */}
            <col style={{ width: '8%' }} />  {/* ریٹ: Rate */}
            <col style={{ width: '9%' }} />  {/* وزن: Weight */}
            <col style={{ width: '7%' }} />  {/* تعداد: Quantity */}
            <col style={{ width: '9%' }} />  {/* بل: Bill No */}
            <col style={{ width: '15%' }} /> {/* تفصیل: Detail */}
            <col style={{ width: '9%' }} />  {/* تاریخ: Date */}
          </colgroup>

          <thead>
            <tr className="bg-white text-center font-bold">
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}></th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>بقایا</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>جمع</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>بنام</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>ریٹ</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>وزن</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>تعداد</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>بل</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 4px', textAlign: 'right' }}>تفصیل</th>
              <th style={{ border: BORDER_STYLE, padding: '4px 2px' }}>تاریخ</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-gray-500 font-medium"
                  style={{ border: BORDER_STYLE }}
                >
                  No transaction history recorded for this period.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isDebit = Number(row.debit) > 0;
                const isCredit = Number(row.credit) > 0;
                const rowMarker = row.marker
                  ? row.marker === 'بنام'
                    ? 'نام'
                    : row.marker
                  : isCredit
                  ? 'جمع'
                  : isDebit
                  ? 'نام'
                  : '—';

                return (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-yellow-50/50' : ''}`}
                    style={{
                      backgroundColor: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                      lineHeight: '1.2',
                    }}
                  >
                    {/* 1. Marker column (جمع or بنام) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: rowMarker === 'جمع' ? '#1b5e20' : '#b71c1c',
                      }}
                    >
                      {rowMarker}
                    </td>

                    {/* 2. بقایا (Balance) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 4px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    >
                      {row.balance !== undefined && row.balance !== null
                        ? Number(row.balance).toLocaleString('en-US', {
                            minimumFractionDigits: mode === 'currency' ? 0 : 0,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>

                    {/* 3. جمع (Credit / Total) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 4px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Number(row.credit) > 0
                        ? Number(row.credit).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                          })
                        : ''}
                    </td>

                    {/* 4. بنام (Debit / Counterparty) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 4px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Number(row.debit) > 0
                        ? Number(row.debit).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                          })
                        : ''}
                    </td>

                    {/* 5. ریٹ (Rate) — Blank for pure cash entries */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Number(row.rate) > 0
                        ? Number(row.rate).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ''}
                    </td>

                    {/* 6. وزن (Weight / KG) — Blank for pure cash entries */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Number(row.weight) > 0
                        ? Number(row.weight).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ''}
                    </td>

                    {/* 7. تعداد (Quantity / Nug) — Blank for pure cash entries */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Number(row.quantity) > 0 ? Number(row.quantity) : ''}
                    </td>

                    {/* 8. بل (Bill No / Ref) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {row.billNo || '—'}
                    </td>

                    {/* 9. تفصیل (Detail) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 6px',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.detail || '—'}
                    </td>

                    {/* 10. تاریخ (Date) */}
                    <td
                      style={{
                        border: BORDER_STYLE,
                        padding: '3px 2px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtDateShort(row.date)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Total Footer Row */}
          <tfoot>
            <tr className="bg-white font-bold text-center" style={{ borderTop: '2px solid #000' }}>
              <td style={{ border: BORDER_STYLE, padding: '4px 2px' }}></td>

              {/* Total Balance */}
              <td
                style={{
                  border: BORDER_STYLE,
                  padding: '4px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                }}
              >
                {finalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </td>

              {/* Total Credit */}
              <td
                style={{
                  border: BORDER_STYLE,
                  padding: '4px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#1b5e20',
                }}
              >
                {totalCredit ? totalCredit.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}
              </td>

              {/* Total Debit */}
              <td
                style={{
                  border: BORDER_STYLE,
                  padding: '4px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#b71c1c',
                }}
              >
                {totalDebit ? totalDebit.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}
              </td>

              {/* Empty rate column */}
              <td style={{ border: BORDER_STYLE, padding: '4px' }}></td>

              {/* Total Weight */}
              <td
                style={{
                  border: BORDER_STYLE,
                  padding: '4px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
              >
                {totalWeight ? totalWeight.toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
              </td>

              {/* Total Qty */}
              <td
                style={{
                  border: BORDER_STYLE,
                  padding: '4px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                }}
              >
                {totalQty ? totalQty : ''}
              </td>

              <td colSpan={3} style={{ border: BORDER_STYLE, padding: '4px 8px', textAlign: 'left' }}>
                <span className="font-serif font-bold text-xs">میزان کل (Total Summary)</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
