import React from 'react';
import { Printer } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { safePrint } from '../../utils/printUtils.js';
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
  urduName = '',
  englishName = '',
  phone = '',
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

  const hasUrdu = /[\u0600-\u06FF]/.test(accountName);
  const displayUrduName = urduName || (hasUrdu ? accountName : '');
  const displayEnglishName = englishName || (!hasUrdu ? accountName : '');

  const handlePrint = () => {
    safePrint();
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
        <div className="mb-4 space-y-2 border-b border-black pb-3">
          {/* Top Line: Timestamp, Title, Account Badge */}
          <div className="flex items-center justify-between">
            {/* Top-left: Live timestamp */}
            <div className="text-sm num text-gray-700 w-1/4" dir="ltr">
              {timestamp}
            </div>

            {/* Center: STATEMENT OF ACCOUNT */}
            <div className="text-center w-2/4">
              <h2 className="text-[26px] font-bold text-[#1a6b2e] tracking-wider font-urdu leading-normal">
                اسٹیٹمنٹ آف اکاؤنٹ
              </h2>
              <h1 className="text-xs font-black text-gray-700 tracking-wider uppercase">
                STATEMENT OF ACCOUNT
              </h1>
            </div>

            {/* Top-right: Yellow Badge */}
            <div className="flex items-center justify-end gap-2 w-1/4">
              <div className="bg-[#FFEB3B] border border-black px-3 py-1 text-sm font-bold text-red-900 shadow-xs font-urdu">
                {badgeText}
              </div>
            </div>
          </div>

          {/* Dedicated Account / Party Name Box (40px bold on screen, 24pt bold in print, centered inside a bordered box at top) */}
          <div className="text-center py-2.5 px-4 border-2 border-black my-2 bg-white shadow-xs">
            {/* Urdu Name first (40px screen / 24pt print) */}
            <div
              className="text-[40px] print:text-[24pt] font-bold text-black font-urdu leading-normal tracking-wide"
              dir="rtl"
            >
              {displayUrduName || displayEnglishName || accountName || 'کھاتہ'}
            </div>

            {/* English Name below at 22px */}
            {displayEnglishName && displayEnglishName !== displayUrduName && (
              <div className="text-[22px] print:text-[14pt] font-bold text-gray-800 tracking-wide mt-0.5">
                {displayEnglishName}
              </div>
            )}

            {/* Party Code and Phone below at 18px */}
            <div className="flex items-center justify-center gap-6 text-[18px] print:text-[12pt] font-bold text-gray-800 mt-1">
              {acCode && (
                <span>
                  کوڈ (Code): <span className="num font-bold text-[18px] print:text-[12pt]">{acCode}</span>
                </span>
              )}
              {phone && (
                <span>
                  فون (Phone): <span className="num font-bold text-[18px] print:text-[12pt]">{phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* Line: A/C Code, Period Date Range Filter */}
          <div className="flex flex-wrap items-center justify-between text-base pt-1 gap-2">
            <div className="font-bold flex items-center gap-2">
              <span className="font-urdu text-[18px]">کوڈ:</span>
              <span className="num font-extrabold bg-gray-100 px-2.5 py-0.5 border border-black/40 text-[18px]">{acCode}</span>
            </div>

            <div className="flex items-center gap-2 font-medium text-base">
              <span className="font-urdu font-bold text-[18px]">مدت از:</span>
              {/* Screen editable date inputs */}
              <div className="print:hidden flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom && setDateFrom(e.target.value)}
                  className="border border-black px-2 py-1 num text-base bg-white outline-none cursor-pointer"
                  title="Filter start date"
                />
                <span className="font-urdu font-bold text-[18px]">تا:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo && setDateTo(e.target.value)}
                  className="border border-black px-2 py-1 num text-base bg-white outline-none cursor-pointer"
                  title="Filter end date"
                />
              </div>
              {/* Print view boxed dates matching reference format e.g. 01-MAR-22 To 03-OCT-26 */}
              <div className="hidden print:inline-flex items-center gap-1.5">
                <span className="border border-black px-2.5 py-0.5 num text-base font-bold">
                  {dateFrom ? fmtDateUpper(dateFrom) : filteredRows[0]?.date ? fmtDateUpper(filteredRows[0].date) : 'START'}
                </span>
                <span className="font-urdu font-bold text-[18px]">تا</span>
                <span className="border border-black px-2.5 py-0.5 num text-base font-bold">
                  {dateTo ? fmtDateUpper(dateTo) : fmtDateUpper(new Date())}
                </span>
              </div>
            </div>
          </div>

          {/* Opening Balance Line (سابقہ بیلنس) */}
          <div className="flex items-center justify-between text-base pt-1">
            <div className="flex items-center gap-3">
              <span className="font-urdu font-bold text-[22px] print:text-[14pt]" dir="rtl">سابقہ بیلنس (Opening Balance):</span>
              <span className="num font-bold text-[22px] print:text-[14pt]">
                {openingBalance
                  ? mode === 'currency'
                    ? `${fmtNum(Math.abs(openingBalance))}${openingBalance > 0 ? ' Cr' : openingBalance < 0 ? ' Dr' : ''}`
                    : `${fmtNum(openingBalance)} ${unitLabel}`
                  : '0'}
              </span>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-sm text-gray-500 font-sans">
                Showing {filteredRows.length} entries
              </span>
            )}
          </div>
        </div>

        {/* ── Main Ledger Grid (PERBALACC Exact Bordered Table) ── */}
        <table
          className="classic-ledger-table w-full border-collapse text-base text-black"
          dir="rtl"
          style={{
            borderCollapse: 'collapse',
            border: BORDER_STYLE,
            tableLayout: 'fixed',
            direction: 'rtl',
          }}
        >
          {/* Column definitions matching RTL order:
              Right-to-Left: تاریخ | تفصیل | واؤچر نمبر | نگ | کلو | ریٹ | بنام | جمع | بیلنس | [حالت]
          */}
          <colgroup>
            <col style={{ width: '10%' }} /> {/* تاریخ: Date */}
            <col style={{ width: '22%' }} /> {/* تفصیل: Detail */}
            <col style={{ width: '9%' }} />  {/* واؤچر نمبر: Voucher No */}
            <col style={{ width: '6%' }} />  {/* نگ: Nug */}
            <col style={{ width: '8%' }} />  {/* کلو: KG */}
            <col style={{ width: '7%' }} />  {/* ریٹ: Rate */}
            <col style={{ width: '12%' }} /> {/* بنام: Debit */}
            <col style={{ width: '12%' }} /> {/* جمع: Credit */}
            <col style={{ width: '11%' }} /> {/* بیلنس: Balance */}
            <col style={{ width: '3%' }} />  {/* Marker: جمع/نام */}
          </colgroup>

          <thead>
            <tr className="bg-white text-center font-bold">
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>تاریخ</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 8px', textAlign: 'start' }}>تفصیل</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>واؤچر نمبر</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>نگ</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>کلو</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>ریٹ</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>بنام</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>جمع</th>
              <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ border: BORDER_STYLE, padding: '6px 4px' }}>بیلنس</th>
              <th className="font-urdu font-bold text-[18px] print:text-[12pt]" style={{ border: BORDER_STYLE, padding: '6px 2px' }}></th>
            </tr>
          </thead>

          <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-gray-500 font-urdu text-[20px] print:text-[13pt]"
                  style={{ border: BORDER_STYLE }}
                >
                  اس مدت میں کوئی لین دین درج نہیں ہے۔ (No transaction history)
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
                      minHeight: '40px',
                    }}
                  >
                    {/* 1. تاریخ (Date) */}
                    <td
                      className="num text-center"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        whiteSpace: 'nowrap',
                        direction: 'ltr',
                      }}
                    >
                      {fmtDateShort(row.date)}
                    </td>

                    {/* 2. تفصیل (Detail) */}
                    <td
                      className="font-urdu text-[20px] print:text-[13pt] leading-relaxed"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 10px',
                        textAlign: 'start',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.detail || '—'}
                    </td>

                    {/* 3. واؤچر نمبر (Voucher / Bill No) */}
                    <td
                      className="num text-center"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 6px',
                        direction: 'ltr',
                      }}
                    >
                      {row.billNo || '—'}
                    </td>

                    {/* 4. نگ (Quantity / Nug) */}
                    <td
                      className="num text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.quantity) > 0 ? fmtNum(row.quantity) : ''}
                    </td>

                    {/* 5. کلو (Weight / KG) */}
                    <td
                      className="num text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.weight) > 0 ? fmtNum(row.weight) : ''}
                    </td>

                    {/* 6. ریٹ (Rate) */}
                    <td
                      className="num text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.rate) > 0 ? fmtNum(row.rate) : ''}
                    </td>

                    {/* 7. بنام (Debit) */}
                    <td
                      className="num text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.debit) > 0 ? fmtNum(row.debit) : ''}
                    </td>

                    {/* 8. جمع (Credit) */}
                    <td
                      className="num text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.credit) > 0 ? fmtNum(row.credit) : ''}
                    </td>

                    {/* 9. بیلنس (Balance) */}
                    <td
                      className="num-total text-start"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 8px',
                        direction: 'ltr',
                      }}
                    >
                      {row.balance !== undefined && row.balance !== null
                        ? `${fmtNum(Math.abs(Number(row.balance)))}${Number(row.balance) > 0 ? ' Cr' : Number(row.balance) < 0 ? ' Dr' : ''}`
                        : '—'}
                    </td>

                    {/* 10. Marker column (جمع or بنام) */}
                    <td
                      className="font-urdu font-bold text-[18px] print:text-[12pt] text-center"
                      style={{
                        border: BORDER_STYLE,
                        padding: '6px 2px',
                        color: rowMarker === 'جمع' ? '#000000' : '#b71c1c',
                      }}
                    >
                      {rowMarker}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Total Footer Row */}
          <tfoot>
            <tr className="bg-white font-bold text-center" style={{ borderTop: '2px solid #000' }}>
              <td colSpan={3} style={{ border: BORDER_STYLE, padding: '8px 10px', textAlign: 'start' }}>
                <span className="font-urdu font-bold text-[22px] print:text-[14pt]">میزان کل (ٹوٹل)</span>
              </td>

              {/* Total Qty (نگ) */}
              <td
                className="num-total text-start"
                style={{
                  border: BORDER_STYLE,
                  padding: '6px 8px',
                  direction: 'ltr',
                }}
              >
                {totalQty ? fmtNum(totalQty) : ''}
              </td>

              {/* Total Weight (کلو) */}
              <td
                className="num-total text-start"
                style={{
                  border: BORDER_STYLE,
                  padding: '6px 8px',
                  direction: 'ltr',
                }}
              >
                {totalWeight ? fmtNum(totalWeight) : ''}
              </td>

              {/* Empty rate column */}
              <td style={{ border: BORDER_STYLE, padding: '6px 4px' }}></td>

              {/* Total Debit (بنام) */}
              <td
                className="num-total text-start"
                style={{
                  border: BORDER_STYLE,
                  padding: '6px 8px',
                  direction: 'ltr',
                  color: '#b71c1c',
                }}
              >
                {totalDebit ? fmtNum(totalDebit) : '0'}
              </td>

              {/* Total Credit (جمع) */}
              <td
                className="num-total text-start"
                style={{
                  border: BORDER_STYLE,
                  padding: '6px 8px',
                  direction: 'ltr',
                }}
              >
                {totalCredit ? fmtNum(totalCredit) : '0'}
              </td>

              {/* Total Balance (بیلنس) */}
              <td
                className="num-total text-start"
                style={{
                  border: BORDER_STYLE,
                  padding: '6px 8px',
                  direction: 'ltr',
                }}
              >
                {fmtNum(Math.abs(finalBalance))}
                {finalBalance > 0 ? ' Cr' : finalBalance < 0 ? ' Dr' : ''}
              </td>

              {/* Marker column */}
              <td style={{ border: BORDER_STYLE, padding: '6px 2px' }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
