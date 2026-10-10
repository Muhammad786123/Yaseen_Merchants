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

  const containerRef = React.useRef(null);
  const [fitScale, setFitScale] = React.useState(1.0);

  React.useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const availWidth = containerRef.current.clientWidth;
      const targetWidth = 860;
      if (availWidth < targetWidth && availWidth > 0) {
        const scale = Math.max(0.75, availWidth / targetWidth);
        setFitScale(scale);
      } else {
        setFitScale(1.0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`w-full max-w-[1400px] mx-auto space-y-3 ${className}`}>
      {/* Top Controls: Entity Selector and Print Action (Hidden on paper) — LTR */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-[#FAF9F7] p-2.5 rounded-xl border border-[#E0DBD3]" dir="ltr">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {entitySelector}
        </div>
        <Button variant="primary" icon={Printer} onClick={handlePrint}>
          Print Statement
        </Button>
      </div>

      {/* Main Classic "PERBALACC" Statement Container */}
      <div
        ref={containerRef}
        id="classic-ledger-print-area"
        className="report-rtl bg-white print-area p-3 sm:p-5 border-2 border-black shadow-sm font-sans text-black w-full flex flex-col print:p-0 print:border-none print:shadow-none"
        dir="rtl"
        style={{
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          width: '100%',
          maxHeight: 'calc(100vh - 180px)',
          minHeight: '450px',
          transform: fitScale < 1 ? `scale(${fitScale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* Header Block — Sticky top with reduced vertical padding */}
        <div className="sticky top-0 bg-white z-20 pb-1 mb-1 border-b border-black flex-shrink-0">
          {/* Top Line: Timestamp, Title, Account Badge */}
          <div className="flex items-center justify-between">
            {/* Timestamp */}
            <div className="text-xs num text-gray-700 w-1/4" dir="ltr">
              {timestamp}
            </div>

            {/* Center: STATEMENT OF ACCOUNT */}
            <div className="text-center w-2/4">
              <h2 className="text-lg font-bold text-[#1a6b2e] tracking-wider font-urdu leading-tight">
                اسٹیٹمنٹ آف اکاؤنٹ
              </h2>
              <h1 className="text-[10px] font-black text-gray-600 tracking-wider uppercase">
                STATEMENT OF ACCOUNT
              </h1>
            </div>

            {/* Account Badge */}
            <div className="flex items-center justify-end gap-2 w-1/4">
              <div className="bg-[#FFEB3B] border border-black px-2.5 py-0.5 text-xs font-bold text-red-900 shadow-xs font-urdu">
                {badgeText}
              </div>
            </div>
          </div>

          {/* Dedicated Account / Party Name Box (tight padding, keep large font sizes) */}
          <div className="text-center py-1 px-3 border-2 border-black my-1 bg-white shadow-xs">
            {/* Urdu Name */}
            <div
              className="text-2xl print:text-xl font-bold text-black font-urdu leading-tight tracking-wide"
              dir="rtl"
            >
              {displayUrduName || displayEnglishName || accountName || 'کھاتہ'}
            </div>

            {/* English Name below */}
            {displayEnglishName && displayEnglishName !== displayUrduName && (
              <div className="text-xs font-bold text-gray-800 tracking-wide mt-0.5">
                {displayEnglishName}
              </div>
            )}

            {/* Party Code and Phone below */}
            <div className="flex items-center justify-center gap-6 text-xs print:text-[10px] font-bold text-gray-700 mt-0.5">
              {acCode && (
                <span>
                  کوڈ (Code): <span className="num font-bold text-xs" dir="ltr">{acCode}</span>
                </span>
              )}
              {phone && (
                <span>
                  فون (Phone): <span className="num font-bold text-xs" dir="ltr">{phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* Line: A/C Code, Period Date Range Filter */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-0.5 gap-2">
            <div className="font-bold flex items-center gap-2">
              <span className="font-urdu text-sm">کوڈ:</span>
              <span className="num font-extrabold bg-gray-100 px-2 py-0.5 border border-black/40 text-xs" dir="ltr">{acCode}</span>
            </div>

            <div className="flex items-center gap-2 font-medium text-xs">
              <span className="font-urdu font-bold text-sm">مدت از:</span>
              {/* Screen editable date inputs */}
              <div className="print:hidden flex items-center gap-1.5" dir="ltr">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom && setDateFrom(e.target.value)}
                  className="border border-black px-1.5 py-0.5 num text-xs bg-white outline-none cursor-pointer"
                  title="Filter start date"
                />
                <span className="font-urdu font-bold text-sm">تا:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo && setDateTo(e.target.value)}
                  className="border border-black px-1.5 py-0.5 num text-xs bg-white outline-none cursor-pointer"
                  title="Filter end date"
                />
              </div>
              {/* Print view boxed dates */}
              <div className="hidden print:inline-flex items-center gap-1.5">
                <span className="border border-black px-2 py-0.5 num text-xs font-bold" dir="ltr">
                  {dateFrom ? fmtDateUpper(dateFrom) : filteredRows[0]?.date ? fmtDateUpper(filteredRows[0].date) : 'START'}
                </span>
                <span className="font-urdu font-bold text-xs">تا</span>
                <span className="border border-black px-2 py-0.5 num text-xs font-bold" dir="ltr">
                  {dateTo ? fmtDateUpper(dateTo) : fmtDateUpper(new Date())}
                </span>
              </div>
            </div>
          </div>

          {/* Opening Balance Line (سابقہ بیلنس) */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-urdu font-bold text-sm" dir="rtl">سابقہ بیلنس (Opening Balance):</span>
              <span className="num font-bold text-sm" dir="ltr">
                {openingBalance
                  ? mode === 'currency'
                    ? `${fmtNum(Math.abs(openingBalance))}${openingBalance > 0 ? ' Cr' : openingBalance < 0 ? ' Dr' : ''}`
                    : `${fmtNum(openingBalance)} ${unitLabel}`
                  : '0'}
              </span>
            </div>
            {filteredRows.length > 0 && (
              <span className="text-xs text-gray-500 font-sans" dir="ltr">
                Showing {filteredRows.length} entries
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable Table Area (Rows scroll vertically, header & totals sticky) ── */}
        <div className="overflow-y-auto flex-1 min-h-0 w-full">
          <table
            className="classic-ledger-table w-full border-collapse text-xs sm:text-sm text-black"
            dir="rtl"
            style={{
              borderCollapse: 'collapse',
              border: BORDER_STYLE,
              tableLayout: 'fixed',
              width: '100%',
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

            <thead className="sticky top-0 z-10 bg-white shadow-xs">
              <tr className="bg-white text-center font-bold">
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>تاریخ</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 6px', textAlign: 'start' }}>تفصیل</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>واؤچر نمبر</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>نگ</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>کلو</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>ریٹ</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>بنام</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>جمع</th>
              <th className="font-urdu font-bold text-sm print:text-xs" style={{ border: BORDER_STYLE, padding: '4px 3px' }}>بیلنس</th>
              <th className="font-urdu font-bold text-xs print:text-[10px]" style={{ border: BORDER_STYLE, padding: '4px 2px' }}></th>
            </tr>
          </thead>

          <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-6 text-center text-gray-500 font-urdu text-sm print:text-xs"
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
                      minHeight: '26px',
                    }}
                  >
                    {/* 1. تاریخ (Date) */}
                    <td
                      className="num text-center text-xs"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        whiteSpace: 'nowrap',
                        direction: 'ltr',
                      }}
                    >
                      {fmtDateShort(row.date)}
                    </td>

                    {/* 2. تفصیل (Detail) */}
                    <td
                      className="font-urdu text-sm print:text-xs leading-normal"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 6px',
                        textAlign: 'start',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.detail || '—'}
                    </td>

                    {/* 3. واؤچر نمبر (Voucher / Bill No) */}
                    <td
                      className="num text-center text-xs"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {row.billNo || '—'}
                    </td>

                    {/* 4. نگ (Quantity / Nug) */}
                    <td
                      className="num text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.quantity) > 0 ? fmtNum(row.quantity) : ''}
                    </td>

                    {/* 5. کلو (Weight / KG) */}
                    <td
                      className="num text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.weight) > 0 ? fmtNum(row.weight) : ''}
                    </td>

                    {/* 6. ریٹ (Rate) */}
                    <td
                      className="num text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.rate) > 0 ? fmtNum(row.rate) : ''}
                    </td>

                    {/* 7. بنام (Debit) */}
                    <td
                      className="num text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.debit) > 0 ? fmtNum(row.debit) : ''}
                    </td>

                    {/* 8. جمع (Credit) */}
                    <td
                      className="num text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {Number(row.credit) > 0 ? fmtNum(row.credit) : ''}
                    </td>

                    {/* 9. بیلنس (Balance) */}
                    <td
                      className="num-total text-start text-xs sm:text-sm"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 4px',
                        direction: 'ltr',
                      }}
                    >
                      {row.balance !== undefined && row.balance !== null
                        ? `${fmtNum(Math.abs(Number(row.balance)))}${Number(row.balance) > 0 ? ' Cr' : Number(row.balance) < 0 ? ' Dr' : ''}`
                        : '—'}
                    </td>

                    {/* 10. Marker column (جمع or بنام) */}
                    <td
                      className="font-urdu font-bold text-xs print:text-[10px] text-center"
                      style={{
                        border: BORDER_STYLE,
                        padding: '2px 2px',
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
              <td colSpan={3} style={{ border: BORDER_STYLE, padding: '4px 6px', textAlign: 'start' }}>
                <span className="font-urdu font-bold text-sm print:text-xs">میزان کل (ٹوٹل)</span>
              </td>

              {/* Total Qty (نگ) */}
              <td
                className="num-total text-start text-xs sm:text-sm"
                style={{
                  border: BORDER_STYLE,
                  padding: '3px 4px',
                  direction: 'ltr',
                }}
              >
                {totalQty ? fmtNum(totalQty) : ''}
              </td>

              {/* Total Weight (کلو) */}
              <td
                className="num-total text-start text-xs sm:text-sm"
                style={{
                  border: BORDER_STYLE,
                  padding: '3px 4px',
                  direction: 'ltr',
                }}
              >
                {totalWeight ? fmtNum(totalWeight) : ''}
              </td>

              {/* Empty rate column */}
              <td style={{ border: BORDER_STYLE, padding: '3px 4px' }}></td>

              {/* Total Debit (بنام) */}
              <td
                className="num-total text-start text-xs sm:text-sm"
                style={{
                  border: BORDER_STYLE,
                  padding: '3px 4px',
                  direction: 'ltr',
                  color: '#b71c1c',
                }}
              >
                {totalDebit ? fmtNum(totalDebit) : '0'}
              </td>

              {/* Total Credit (جمع) */}
              <td
                className="num-total text-start text-xs sm:text-sm"
                style={{
                  border: BORDER_STYLE,
                  padding: '3px 4px',
                  direction: 'ltr',
                }}
              >
                {totalCredit ? fmtNum(totalCredit) : '0'}
              </td>

              {/* Total Balance (بیلنس) */}
              <td
                className="num-total text-start text-xs sm:text-sm"
                style={{
                  border: BORDER_STYLE,
                  padding: '3px 4px',
                  direction: 'ltr',
                }}
              >
                {fmtNum(Math.abs(finalBalance))}
                {finalBalance > 0 ? ' Cr' : finalBalance < 0 ? ' Dr' : ''}
              </td>

              {/* Marker column */}
              <td style={{ border: BORDER_STYLE, padding: '3px 2px' }}></td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}
