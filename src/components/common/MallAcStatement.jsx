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
  if (!n || isNaN(n) || n === 0) return '0.00';
  return Number(Math.abs(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
  if (!n || isNaN(n) || Number(n) === 0) return '';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

export default function MallAcStatement({
  ledgerRows = [],
  openingBalance = 0,
  dateFrom = '',
  dateTo = '',
  acCode = 'MALL-AC',
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
    border: BORDER,
    padding: '2px 4px',
    fontSize: '8.5px',
    lineHeight: 1.3,
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
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        color: '#000',
        direction: 'ltr',
      }}
    >
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          marginBottom: '6px',
        }}
      >
        <tbody>
          <tr>
            {/* Top-left: timestamp & printed by */}
            <td
              style={{
                width: '28%',
                verticalAlign: 'top',
                textAlign: 'left',
                border: 'none',
                padding: '0',
                fontSize: '8.5px',
                color: '#333',
                lineHeight: 1.3,
              }}
            >
              <div>{fmtDateTime()}</div>
              <div style={{ color: '#666', fontSize: '8px' }}>User: {effectivePrintedBy}</div>
            </td>

            {/* Center: Title & Period */}
            <td
              style={{
                width: '44%',
                verticalAlign: 'top',
                textAlign: 'center',
                border: 'none',
                padding: '0',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#1a6b2e',
                  letterSpacing: '0.05em',
                  lineHeight: 1.2,
                }}
              >
                STATEMENT OF ACCOUNT
              </div>
              <div style={{ fontSize: '9px', color: '#222', marginTop: '1px', fontWeight: 600 }}>
                A/C Code: <span style={{ fontWeight: 800 }}>{acCode}</span>
              </div>
              <div style={{ fontSize: '8.5px', color: '#444', marginTop: '1px' }}>
                A/C Ledger for the period <strong>{periodLabel}</strong>
              </div>
            </td>

            {/* Top-right: account type badge */}
            <td
              style={{
                width: '28%',
                verticalAlign: 'top',
                textAlign: 'right',
                border: 'none',
                padding: '0',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1a6b2e',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '3px',
                  fontFamily: "'Noto Nastaliq Urdu', serif",
                }}
              >
                مال اے/سی
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Opening Balance line ──────────────────────────────────────────── */}
      <div
        style={{
          fontSize: '9px',
          marginBottom: '5px',
          fontWeight: 700,
          textAlign: 'right',
          direction: 'rtl',
        }}
      >
        سابقہ بقایا (Opening Balance):{' '}
        <span style={{ fontFamily: 'monospace', direction: 'ltr', display: 'inline-block' }}>
          {openingBalance !== 0
            ? `${Math.abs(openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${openingBalance >= 0 ? '(Cr)' : '(Dr)'}`
            : '0.00'}
        </span>
      </div>

      {/* ── Main Ledger Table (PERBALACC Bordered Grid) ───────────────────── */}
      <table
        className="mallac-grid-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          direction: 'rtl',
          tableLayout: 'fixed',
          marginBottom: '8px',
        }}
      >
        {/* Proportional column distribution summing to exactly 100%:
            RTL order: بقایا | جمع | بنام | ریٹ | وزن | تعداد | بل | تفصیل | تاریخ
        */}
        <colgroup>
          <col style={{ width: '3%' }} />    {/* marker: جمع / نام (3%) */}
          <col style={{ width: '13%' }} />   {/* بقایا: Balance (13%) */}
          <col style={{ width: '13%' }} />   {/* جمع / رقم: Total/Amount (13%) */}
          <col style={{ width: '16%' }} />   {/* بنام: Party Name (16%) */}
          <col style={{ width: '7%' }} />    {/* ریٹ: Rate (7%) */}
          <col style={{ width: '7%' }} />    {/* وزن: Weight (7%) */}
          <col style={{ width: '7%' }} />    {/* تعداد: Qty (7%) */}
          <col style={{ width: '11%' }} />   {/* بل: Bill No. (11%) */}
          <col style={{ width: '14%' }} />   {/* تفصیل: Detail (14%) */}
          <col style={{ width: '9%' }} />    {/* تاریخ: Date (9%) */}
        </colgroup>

        <thead>
          <tr style={{ backgroundColor: HEADER_BG }}>
            <th style={cell({ textAlign: 'center', fontWeight: 900, fontSize: '8px', whiteSpace: 'nowrap' })}></th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>بقایا</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>جمع</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>بنام</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>ریٹ</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>وزن</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>تعداد</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>بل</th>
            <th style={cell({ textAlign: 'right', fontWeight: 900 })}>تفصیل</th>
            <th style={cell({ textAlign: 'center', fontWeight: 900, whiteSpace: 'nowrap' })}>تاریخ</th>
          </tr>
        </thead>

        <tbody>
          {processedRows.map((row, idx) => {
            const isSale = row.category === 'Sale';
            const isPurchase = row.category === 'Purchase';
            const isStockRow = isSale || isPurchase;

            // marker: جمع for credit (sale), نام for debit (purchase/expense)
            const marker = isSale ? 'جمع' : 'نام';
            const markerColor = isSale ? '#1a6b2e' : '#c0392b';

            // Amount shown: credit for sale, debit for purchase/expense
            const amount = isSale ? row.credit : row.debit;

            // Balance with Cr/Dr indicator
            const balSign = row.runningBal >= 0 ? 'Cr' : 'Dr';
            const balDisplay = `${Math.abs(row.runningBal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balSign}`;

            // Qty/Weight/Rate — only for stock rows
            const qty = isStockRow ? fmtNum(row.quantity) : '';
            const weight = isStockRow ? fmtNum(row.weight) : '';
            const rate = isStockRow ? fmtNum(row.rate) : '';

            // Description: combine partyName + detail compactly
            const detail = row.description || '';

            const rowBg = idx % 2 === 0 ? '#fff' : '#f9fafb';

            return (
              <tr key={row.id || idx} style={{ backgroundColor: rowBg, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {/* Marker column */}
                <td
                  style={cell({
                    textAlign: 'center',
                    color: markerColor,
                    fontWeight: 700,
                    fontSize: '8px',
                    fontFamily: "'Noto Nastaliq Urdu', serif",
                    whiteSpace: 'nowrap',
                  })}
                >
                  {marker}
                </td>
                {/* بقایا — Balance */}
                <td
                  style={cell({
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '8.5px',
                    color: row.runningBal >= 0 ? '#1a6b2e' : '#c0392b',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {balDisplay}
                </td>
                {/* جمع — Amount */}
                <td
                  style={cell({
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '8.5px',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {fmtAmt(amount)}
                </td>
                {/* بنام — Party Name */}
                <td
                  style={cell({
                    textAlign: 'right',
                    fontFamily: "'Noto Nastaliq Urdu', 'Outfit', sans-serif",
                    fontSize: '8.5px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  })}
                >
                  {row.partyName || '—'}
                </td>
                {/* ریٹ — Rate */}
                <td style={cell({ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '8.5px' })}>{rate}</td>
                {/* وزن — Weight */}
                <td style={cell({ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '8.5px' })}>{weight}</td>
                {/* تعداد — Quantity */}
                <td style={cell({ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '8.5px' })}>{qty}</td>
                {/* بل — Bill/Voucher No */}
                <td
                  style={cell({
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#1E3A5F',
                    whiteSpace: 'nowrap',
                    fontSize: '8.5px',
                  })}
                >
                  {row.no || '—'}
                </td>
                {/* تفصیل — Detail */}
                <td
                  style={cell({
                    textAlign: 'right',
                    color: '#333',
                    fontFamily: "'Noto Nastaliq Urdu', 'Outfit', sans-serif",
                    fontSize: '8px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  })}
                >
                  {detail}
                </td>
                {/* تاریخ — Date */}
                <td style={cell({ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '8.5px' })}>{fmtDate(row.date)}</td>
              </tr>
            );
          })}
        </tbody>

        {/* ── Totals footer ─────────────────────────────────────────────── */}
        <tfoot>
          <tr style={{ backgroundColor: HEADER_BG, fontWeight: 900 }}>
            <td style={cell({ textAlign: 'center', fontSize: '8px', fontFamily: "'Noto Nastaliq Urdu', serif" })}>کل</td>
            <td style={cell({ textAlign: 'left', fontSize: '8.5px' })}>
              {(() => {
                const sign = closingBalance >= 0 ? 'Cr' : 'Dr';
                return `${Math.abs(closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${sign}`;
              })()}
            </td>
            <td style={cell({ textAlign: 'left' })}>
              {fmtAmt(processedRows.reduce((s, r) => s + (r.credit || 0) + (r.debit || 0), 0))}
            </td>
            <td colSpan={7} style={cell({ textAlign: 'center', fontSize: '8.5px' })}>
              کل اندراجات: {processedRows.length} (Total Transactions: {processedRows.length})
            </td>
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
              padding: '3px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#1a6b2e' }}>
              خلاصہ حساب — مال سیل/پرچیز (MALL-AC STATEMENT SUMMARY)
            </span>
            <span style={{ fontSize: '8px', color: '#555' }}>
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
                  <div style={{ fontSize: '8px', color: '#555', fontWeight: 600 }}>
                    کل فروخت / کریڈٹ (Total Sales / Cr)
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1a6b2e', marginTop: '2px' }}>
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
                  <div style={{ fontSize: '8px', color: '#555', fontWeight: 600 }}>
                    کل خریداری و خرچہ (Purchases & Exp / Dr)
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#c0392b', marginTop: '2px' }}>
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
                  <div style={{ fontSize: '8px', color: '#555', fontWeight: 600 }}>
                    خالص فرق (Net Movement)
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
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
                  <div style={{ fontSize: '8px', color: '#333', fontWeight: 700 }}>
                    آخری بقایا (Closing Balance)
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 900,
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
            fontSize: '8px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 4px',
            marginBottom: '20px',
            borderBottom: '1px dashed #ccc',
          }}
        >
          <span>Printed on: {fmtDateTime()} | Printed by: {printedBy}</span>
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
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#222',
                  }}
                >
                  تیار کنندہ / Prepared By
                </div>
                <div style={{ fontSize: '7.5px', color: '#666' }}>(Accountant / Data Operator)</div>
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
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#222',
                  }}
                >
                  تصدیق کنندہ / Authorized Signature
                </div>
                <div style={{ fontSize: '7.5px', color: '#666' }}>(Proprietor / {legalName})</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
