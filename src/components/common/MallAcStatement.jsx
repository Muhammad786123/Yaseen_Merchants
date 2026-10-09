import React from 'react';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * MallAcStatement — Bordered grid print statement for Sale/Purchase A/C (Mall A/C).
 *
 * Matches the legacy PERBALACC bordered ledger format:
 * - Full grid borders around every cell (crisp thin black lines)
 * - Light green shading on header row (#d4edda)
 * - RTL column order: بقایا | جمع | بنام | ریٹ | وزن | تعداد | بل | تفصیل | تاریخ
 * - جمع/نام row marker in first column (credit = جمع, debit = نام)
 * - Print-ready: id="mallac-print-area" targeted by @media print [id$="-print-area"]
 * - سابقہ بقایا (Opening Balance) shown above the table
 * - Print timestamp top-left, title center, account type badge top-right
 * - Closing footer block:
 *     1. Summary stats box (Total Sales/Cr, Total Purchases/Dr, Net Movement, Closing Balance)
 *     2. Printed on & Printed by metadata
 *     3. Side-by-side signature block (Prepared By & Authorized By)
 */

const BORDER = '1px solid #222';
const HEADER_BG = '#d4edda'; // light green matching PERBALACC reference

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mmm = months[dt.getMonth()];
  const yy = String(dt.getFullYear()).slice(2);
  return `${dd}-${mmm}-${yy}`;
}

function fmtDateTime() {
  const now = new Date();
  const d = fmtDate(now.toISOString().slice(0, 10));
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d} ${h}:${m} ${ampm}`;
}

function fmtAmt(n) {
  if (!n || isNaN(n) || Number(n) === 0) return '0';
  const num = Number(Math.abs(n));
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function fmtNum(n) {
  if (!n || isNaN(n) || Number(n) === 0) return '';
  const num = Number(n);
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export default function MallAcStatement({
  ledgerRows = [],
  openingBalance = 0,
  dateFrom = '',
  dateTo = '',
  acCode = 'MALL-AC',
  accountName = 'Mall Account (Sales & Purchase)',
  urduName = 'مال کھاتہ (سیلز اینڈ پرچیز)',
  phone = '',
  printedBy = '',
  className = '',
}) {
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const effectivePrintedBy = printedBy && printedBy !== 'Shahid Yaseen' ? printedBy : (legalName || 'Shahid Yaseen');
  /* ── Build rows with running balance (front-to-back chronological) ────── */
  const rows = [...ledgerRows].reverse(); // service returns reversed; undo for print
  let running = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const processedRows = rows.map((r) => {
    const cr = Number(r.credit || 0);
    const dr = Number(r.debit || 0);
    totalCredit += cr;
    totalDebit += dr;
    running += cr - dr;
    return { ...r, runningBal: running };
  });

  const closingBalance = processedRows.length > 0 ? processedRows[processedRows.length - 1].runningBal : openingBalance;
  const netMovement = totalCredit - totalDebit;

  const periodLabel =
    dateFrom || dateTo
      ? `${dateFrom ? fmtDate(dateFrom) : 'Start'} To ${dateTo ? fmtDate(dateTo) : 'Today'}`
      : 'All Time';

  /* ── Shared cell style ────────────────────────────────────────────────── */
  const cell = (extra = {}) => ({
    border: '1px solid #000',
    padding: '6px 10px',
    lineHeight: 1.4,
    verticalAlign: 'middle',
    overflow: 'visible',
    wordBreak: 'break-word',
    ...extra,
  });

  return (
    <div
      id="mallac-print-area"
      className={`print-area bg-white ${className}`}
      style={{
        display: 'none', // Hidden on screen, overridden to block in @media print
        boxSizing: 'border-box',
        width: '100%',
        margin: '0',
        padding: '0',
        color: '#000',
        direction: 'rtl',
      }}
    >
      {/* ── Top Header Row ─────────────────────────────────────────────────── */}
      <table
        dir="rtl"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          marginBottom: '6px',
          direction: 'rtl',
        }}
      >
        <tbody>
          <tr>
            {/* Top-right in RTL: account type badge */}
            <td
              style={{
                width: '30%',
                verticalAlign: 'top',
                textAlign: 'start',
                border: 'none',
                padding: '0',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1a6b2e',
                  color: '#fff',
                  fontSize: '14pt',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '3px',
                }}
                className="font-urdu"
              >
                مال کھاتہ لیجر
              </span>
            </td>

            {/* Center: Title & Period */}
            <td
              style={{
                width: '40%',
                verticalAlign: 'top',
                textAlign: 'center',
                border: 'none',
                padding: '0',
              }}
            >
              <div
                className="font-urdu font-bold text-[24px] print:text-[18pt] text-[#1a6b2e] leading-relaxed"
              >
                اسٹیٹمنٹ آف اکاؤنٹ
              </div>
              <div
                className="text-[14px] print:text-[10pt] font-bold text-gray-700 tracking-wider"
              >
                STATEMENT OF ACCOUNT
              </div>
              <div style={{ fontSize: '10pt', color: '#444', marginTop: '2px' }}>
                A/C Ledger for the period <strong>{periodLabel}</strong>
              </div>
            </td>

            {/* Top-left in RTL: timestamp & printed by */}
            <td
              style={{
                width: '30%',
                verticalAlign: 'top',
                textAlign: 'left',
                border: 'none',
                padding: '0',
                fontSize: '10pt',
                color: '#333',
                lineHeight: 1.3,
                direction: 'ltr',
              }}
            >
              <div>{fmtDateTime()}</div>
              <div style={{ color: '#666', fontSize: '10pt' }}>User: {effectivePrintedBy}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Centered Bordered Party / Account Name Box ── */}
      <div
        style={{
          border: '2px solid #000',
          padding: '10px 16px',
          textAlign: 'center',
          backgroundColor: '#fff',
          margin: '8px 0 12px 0',
        }}
      >
        <div
          className="font-urdu font-bold text-[40px] print:text-[24pt] text-black leading-tight"
          dir="rtl"
        >
          {urduName || 'مال کھاتہ (سیلز اینڈ پرچیز)'}
        </div>
        {(accountName || 'Mall Account (Sales & Purchase)') && (
          <div
            className="font-bold text-[22px] print:text-[14pt] text-black mt-1"
            dir="ltr"
          >
            {accountName || 'Mall Account (Sales & Purchase)'}
          </div>
        )}
        <div
          className="text-[18px] print:text-[12pt] font-semibold text-gray-800 mt-1 flex items-center justify-center gap-6"
          dir="rtl"
        >
          <span>کوڈ: <strong className="num text-[18px] print:text-[12pt]">{acCode}</strong></span>
          {phone && (
            <span>فون: <strong className="num text-[18px] print:text-[12pt]">{phone}</strong></span>
          )}
        </div>
      </div>

      {/* ── Opening Balance line ──────────────────────────────────────────── */}
      <div
        style={{
          fontSize: '18px',
          marginBottom: '8px',
          fontWeight: 700,
          textAlign: 'right',
          direction: 'rtl',
        }}
      >
        <span className="font-urdu font-bold text-[22px] print:text-[14pt]">سابقہ بیلنس (Opening Balance): </span>
        <span className="num font-bold text-[22px] print:text-[14pt]">
          {openingBalance !== 0
            ? `${fmtAmt(Math.abs(openingBalance))} ${openingBalance >= 0 ? '(Cr)' : '(Dr)'}`
            : '0'}
        </span>
      </div>

      {/* ── Main Ledger Table (PERBALACC Bordered Grid) ───────────────────── */}
      <table
        className="mallac-grid-table classic-ledger-table"
        dir="rtl"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          direction: 'rtl',
          tableLayout: 'fixed',
          marginBottom: '8px',
          border: '1px solid #000',
        }}
      >
        {/* Proportional column distribution summing to exactly 100%:
            RTL order: تاریخ | تفصیل | واؤچر نمبر | نگ | کلو | ریٹ | پارٹی | رقم | بیلنس | حالت
        */}
        <colgroup>
          <col style={{ width: '10%' }} />   {/* تاریخ: Date (10%) */}
          <col style={{ width: '22%' }} />   {/* تفصیل: Detail (22%) */}
          <col style={{ width: '9%' }} />    {/* واؤچر نمبر: Bill No. (9%) */}
          <col style={{ width: '6%' }} />    {/* نگ: Qty (6%) */}
          <col style={{ width: '8%' }} />    {/* کلو: Weight (8%) */}
          <col style={{ width: '7%' }} />    {/* ریٹ: Rate (7%) */}
          <col style={{ width: '14%' }} />   {/* پارٹی: Party Name (14%) */}
          <col style={{ width: '11%' }} />   {/* رقم: Amount (11%) */}
          <col style={{ width: '11%' }} />   {/* بیلنس: Balance (11%) */}
          <col style={{ width: '2%' }} />    {/* حالت: جمع / نام (2%) */}
        </colgroup>

        <thead>
          <tr style={{ backgroundColor: HEADER_BG }}>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'center' })}>تاریخ</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'start' })}>تفصیل</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'center' })}>واؤچر نمبر</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'center' })}>نگ</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'center' })}>کلو</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'center' })}>ریٹ</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'start' })}>پارٹی</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'start' })}>رقم</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={cell({ textAlign: 'start' })}>بیلنس</th>
            <th className="font-urdu font-bold text-[18px] print:text-[12pt]" style={cell({ textAlign: 'center' })}></th>
          </tr>
        </thead>

        <tbody>
          {processedRows.map((row, idx) => {
            const isSale = row.category === 'Sale';
            const isPurchase = row.category === 'Purchase';
            const isStockRow = isSale || isPurchase;

            // marker: جمع for credit (sale), نام for debit (purchase/expense)
            const marker = isSale ? 'جمع' : 'نام';
            const markerColor = isSale ? '#000000' : '#c0392b';

            // Amount shown: credit for sale, debit for purchase/expense
            const amount = isSale ? row.credit : row.debit;

            // Balance with Cr/Dr indicator
            const balSign = row.runningBal >= 0 ? 'Cr' : 'Dr';
            const balDisplay = `${fmtAmt(row.runningBal || 0)} ${balSign}`;

            // Qty/Weight/Rate — only for stock rows
            const qty = isStockRow ? fmtNum(row.quantity) : '';
            const weight = isStockRow ? fmtNum(row.weight) : '';
            const rate = isStockRow ? fmtNum(row.rate) : '';

            // Description: combine partyName + detail compactly
            const detail = row.description || '';
            const rowBg = idx % 2 === 0 ? '#fff' : '#f9fafb';

            return (
              <tr key={row.id || idx} style={{ backgroundColor: rowBg, pageBreakInside: 'avoid', breakInside: 'avoid', minHeight: '40px' }}>
                {/* 1. تاریخ — Date */}
                <td className="num text-center" style={cell({ whiteSpace: 'nowrap', direction: 'ltr' })}>
                  {fmtDate(row.date)}
                </td>

                {/* 2. تفصیل — Detail */}
                <td
                  className="font-urdu text-[20px] print:text-[13pt] leading-relaxed"
                  style={cell({
                    textAlign: 'start',
                    color: '#000',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  })}
                >
                  {detail}
                </td>

                {/* 3. واؤچر نمبر — Bill/Voucher No */}
                <td
                  className="num text-center"
                  style={cell({
                    direction: 'ltr',
                  })}
                >
                  {row.no || '—'}
                </td>

                {/* 4. نگ — Quantity */}
                <td className="num text-start" style={cell({ direction: 'ltr' })}>
                  {qty}
                </td>

                {/* 5. کلو — Weight */}
                <td className="num text-start" style={cell({ direction: 'ltr' })}>
                  {weight}
                </td>

                {/* 6. ریٹ — Rate */}
                <td className="num text-start" style={cell({ direction: 'ltr' })}>
                  {rate}
                </td>

                {/* 7. پارٹی — Party Name */}
                <td
                  className="font-urdu text-[20px] print:text-[13pt]"
                  style={cell({
                    textAlign: 'start',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  })}
                >
                  {row.partyName || '—'}
                </td>

                {/* 8. رقم — Amount */}
                <td
                  className="num text-start"
                  style={cell({
                    direction: 'ltr',
                  })}
                >
                  {fmtAmt(amount)}
                </td>

                {/* 9. بیلنس — Balance */}
                <td
                  className="num-total text-start"
                  style={cell({
                    color: row.runningBal >= 0 ? '#000000' : '#c0392b',
                    direction: 'ltr',
                  })}
                >
                  {balDisplay}
                </td>

                {/* 10. Marker column */}
                <td
                  className="font-urdu font-bold text-[18px] print:text-[12pt] text-center"
                  style={cell({
                    color: markerColor,
                    whiteSpace: 'nowrap',
                  })}
                >
                  {marker}
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* ── Totals footer ─────────────────────────────────────────────── */}
        <tfoot>
          <tr style={{ backgroundColor: HEADER_BG, fontWeight: 900 }}>
            <td colSpan={7} style={cell({ textAlign: 'start' })}>
              <span className="font-urdu font-bold text-[22px] print:text-[14pt]">
                کل اندراجات: {processedRows.length} (Total Summary)
              </span>
            </td>
            <td className="num-total text-start" style={cell({ direction: 'ltr' })}>
              {fmtAmt(processedRows.reduce((s, r) => s + (r.credit || 0) + (r.debit || 0), 0))}
            </td>
            <td className="num-total text-start" style={cell({ direction: 'ltr' })}>
              {(() => {
                const sign = closingBalance >= 0 ? 'Cr' : 'Dr';
                return `${fmtAmt(closingBalance)} ${sign}`;
              })()}
            </td>
            <td className="font-urdu font-bold text-[18px] print:text-[12pt] text-center" style={cell()}>کل</td>
          </tr>
        </tfoot>
      </table>

      {/* ── CLOSING FOOTER BLOCK ────────────────────────────────────────────
       *  Provides intentional closure so shorter ledgers don't trail into dead blank space:
       *  1. Summary Stats Box: Restates Total Sales/Cr, Total Purchases/Dr, Net Movement, and Closing Balance
       *  2. System / User Print metadata
       *  3. Standard dual signature lines (Prepared By & Authorized By)
       * ─────────────────────────────────────────────────────────────────── */}
      <div
        className="mallac-closing-block"
        style={{
          marginTop: '12px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* 1. Summary Stats Box */}
        <div
          style={{
            border: BORDER,
            borderRadius: '2px',
            backgroundColor: '#fafafa',
            marginBottom: '10px',
            overflow: 'hidden',
          }}
        >
          {/* Header strip */}
          <div
            style={{
              backgroundColor: '#e8f5e9',
              borderBottom: BORDER,
              padding: '4px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '11pt', fontWeight: 800, color: '#1a6b2e' }}>
              خلاصہ حساب — مال سیل/پرچیز (MALL-AC STATEMENT SUMMARY)
            </span>
            <span style={{ fontSize: '10pt', color: '#555' }}>
              مدت: {periodLabel}
            </span>
          </div>

          {/* 4 Summary Metric Cells in a Table for consistent print layout */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: 'none',
              tableLayout: 'fixed',
            }}
          >
            <tbody>
              <tr>
                {/* Total Credit / Sales Revenue */}
                <td
                  style={{
                    width: '25%',
                    padding: '6px 8px',
                    borderRight: BORDER,
                    borderBottom: 'none',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="font-urdu font-bold text-[18px] print:text-[12pt] text-gray-700">
                    کل فروخت / کریڈٹ (Total Sales / Cr)
                  </div>
                  <div className="num-total text-[24px] print:text-[15pt]" style={{ color: '#1a6b2e', marginTop: '2px' }}>
                    Rs. {fmtAmt(totalCredit)}
                  </div>
                </td>

                {/* Total Debit / Purchases & Expenses */}
                <td
                  style={{
                    width: '25%',
                    padding: '6px 8px',
                    borderRight: BORDER,
                    borderBottom: 'none',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="font-urdu font-bold text-[18px] print:text-[12pt] text-gray-700">
                    کل خریداری و خرچہ (Purchases & Exp / Dr)
                  </div>
                  <div className="num-total text-[24px] print:text-[15pt]" style={{ color: '#c0392b', marginTop: '2px' }}>
                    Rs. {fmtAmt(totalDebit)}
                  </div>
                </td>

                {/* Net Movement */}
                <td
                  style={{
                    width: '25%',
                    padding: '6px 8px',
                    borderRight: BORDER,
                    borderBottom: 'none',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="font-urdu font-bold text-[18px] print:text-[12pt] text-gray-700">
                    خالص فرق (Net Movement)
                  </div>
                  <div
                    className="num-total text-[24px] print:text-[15pt]"
                    style={{
                      color: netMovement >= 0 ? '#1a6b2e' : '#c0392b',
                      marginTop: '2px',
                    }}
                  >
                    Rs. {fmtAmt(Math.abs(netMovement))} {netMovement >= 0 ? 'Cr' : 'Dr'}
                  </div>
                </td>

                {/* Closing Balance */}
                <td
                  style={{
                    width: '25%',
                    padding: '6px 8px',
                    border: 'none',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    backgroundColor: '#f1f8e9',
                  }}
                >
                  <div className="font-urdu font-bold text-[18px] print:text-[12pt] text-gray-900">
                    کل بیلنس (Closing Balance)
                  </div>
                  <div
                    className="num-total text-[24px] print:text-[15pt]"
                    style={{
                      color: closingBalance >= 0 ? '#1a6b2e' : '#c0392b',
                      marginTop: '2px',
                    }}
                  >
                    Rs. {fmtAmt(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Cr' : 'Dr'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Metadata Audit Line */}
        <div
          style={{
            fontSize: '10pt',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 6px',
            marginBottom: '20px',
            borderBottom: '1px dashed #ccc',
          }}
        >
          <span>Printed on: {fmtDateTime()} | Printed by: {effectivePrintedBy}</span>
          <span>System: Yaseen Merchants Offline Accounting</span>
          <span>Computer Generated Document</span>
        </div>

        {/* 3. Side-by-side Dual Signature Block */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: 'none',
            marginTop: '24px',
          }}
        >
          <tbody>
            <tr>
              {/* Left: Prepared By */}
              <td
                style={{
                  width: '45%',
                  textAlign: 'center',
                  border: 'none',
                  verticalAlign: 'bottom',
                  padding: '0 20px',
                }}
              >
                <div
                  style={{
                    borderTop: '1px solid #333',
                    paddingTop: '4px',
                    fontSize: '11pt',
                    fontWeight: 700,
                    color: '#222',
                  }}
                >
                  تیار کنندہ / Prepared By
                </div>
                <div style={{ fontSize: '10pt', color: '#666', marginTop: '2px' }}>(Accountant / Data Operator)</div>
              </td>

              {/* Spacer */}
              <td style={{ width: '10%', border: 'none' }}></td>

              {/* Right: Authorized By */}
              <td
                style={{
                  width: '45%',
                  textAlign: 'center',
                  border: 'none',
                  verticalAlign: 'bottom',
                  padding: '0 20px',
                }}
              >
                <div
                  style={{
                    borderTop: '1px solid #333',
                    paddingTop: '4px',
                    fontSize: '11pt',
                    fontWeight: 700,
                    color: '#222',
                  }}
                >
                  تصدیق کنندہ / Authorized Signature
                </div>
                <div style={{ fontSize: '10pt', color: '#666', marginTop: '2px' }}>(Proprietor / {legalName})</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
