import React from 'react';
import { formatDate } from '../../utils/formatters.js';
import PrintFooter from './PrintFooter.jsx';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * UrduPartyStatement — Flat, dense, monochrome Party Statement matching the PERBALACC legacy reference.
 *
 * Layout:
 *   - Plain uniform Naskh/system font (no ornate Nastaliq calligraphy)
 *   - Fully monochrome (pure black text #000 on white)
 *   - Left-to-right reading column flow:
 *       Type (In/Out Payment) → Bill No. → Status → Debit → Credit → Balance
 *   - 3-line-per-transaction block:
 *       Line 1: 6 columns side-by-side with visible spacing
 *       Line 2: تفصیل: <description>
 *       Line 3: Date (DD/MM/YYYY)
 *   - Flat, dense header hierarchy (uniform small plain text, no oversized text or bold colors)
 *   - 100% full printable A4 width with zero clipping
 */

const ROWS_PER_PAGE = 28;

export default function UrduPartyStatement({
  party,
  ledgerRows = [],
  openingBalance = 0,
  dateFrom = '',
  dateTo = '',
  printedBy = '',
  className = '',
}) {
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const effectivePrintedBy = printedBy && printedBy !== 'Shahid Yaseen' ? printedBy : (legalName || 'Shahid Yaseen');

  if (!party) return null;

  /* ── Plain numeric formatters (Monochrome black text) ─────────────────────*/
  const formatRs = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00 Rs';
    return (
      Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' Rs'
    );
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return formatDate(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const periodText =
    dateFrom || dateTo
      ? `${dateFrom ? fmtDate(dateFrom) : 'ابتدا'} تا ${dateTo ? fmtDate(dateTo) : 'تاحال'}`
      : 'تمام وقت';

  /* ── Map ledger rows ─────────────────────────────────────────────────────*/
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = ledgerRows.map((r) => {
    const dr = Number(r.debit || 0);
    const cr = Number(r.credit || 0);
    totalDebit += dr;
    totalCredit += cr;

    let transType = 'In Payment';
    const t = (r.type || '').toLowerCase();
    if (dr > 0 && cr === 0) {
      transType = 'Out Payment';
    } else if (cr > 0 && dr === 0) {
      transType = 'In Payment';
    } else if (t.includes('purchase') || t.includes('cash given') || t.includes('material issue')) {
      transType = 'Out Payment';
    } else if (t.includes('sale') || t.includes('receipt') || t.includes('cash received')) {
      transType = 'In Payment';
    }

    let note = r.detail || '';
    note = note
      .replace(/^Receipt\s*[—-]\s*/i, '')
      .replace(/^Payment\s*[—-]\s*/i, '')
      .replace(/^Purchase\s*[—-]\s*/i, '')
      .replace(/^Sale\s*[—-]\s*/i, '')
      .replace(/^Cash Given\s*[—-]\s*/i, '')
      .replace(/^Cash Received\s*[—-]\s*/i, '')
      .replace(/^Issue\s*[—-]\s*/i, '')
      .trim();

    const bal = Number(r.balance || 0);
    const status = bal > 0 ? '(کریڈٹ)' : bal < 0 ? '(ڈیبٹ)' : '';

    return { ...r, transType, note, dr, cr, bal, status };
  });

  const finalBalance = rows.length > 0 ? rows[rows.length - 1].bal : openingBalance;
  const finalStatus = finalBalance > 0 ? '(کریڈٹ)' : finalBalance < 0 ? '(ڈیبٹ)' : '';

  /* ── Column widths in exact Reference LTR order:
   *   Type → Bill No. → Status → Debit → Credit → Balance
   * ────────────────────────────────────────────────────────────────────────*/
  const colWidths = {
    type: '18%',     // Type (In Payment / Out Payment)
    billNo: '14%',   // Bill / Voucher No
    status: '11%',   // Status (کریڈٹ / ڈیبٹ)
    debit: '18%',    // Debit
    credit: '18%',   // Credit
    balance: '21%',  // Balance
  };

  const cell = (width, extra = {}) => ({
    flex: `0 0 ${width}`,
    width: width,
    maxWidth: width,
    padding: '0 4px',
    overflow: 'visible',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    color: '#000',
    ...extra,
  });

  // Row style in LTR reading flow
  const rowFlexStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    direction: 'ltr',
    fontSize: '9px',
    color: '#000',
    lineHeight: 1.3,
    gap: '8px',
    boxSizing: 'border-box',
  };

  const colHeaderStyle = {
    ...rowFlexStyle,
    fontSize: '8.5px',
    fontWeight: 700,
    borderBottom: '1px solid #000',
    borderTop: '1px solid #000',
    padding: '3px 0',
    marginBottom: '2px',
    color: '#000',
    backgroundColor: '#f5f5f5',
  };

  const ColumnHeaders = () => (
    <div className="statement-col-header" style={colHeaderStyle}>
      <div className="statement-col-type" style={{ ...cell(colWidths.type, { textAlign: 'left' }), order: 1 }}>لین دین کی قسم</div>
      <div className="statement-col-billno" style={{ ...cell(colWidths.billNo, { textAlign: 'left' }), order: 2 }}>بل نمبر</div>
      <div className="statement-col-status" style={{ ...cell(colWidths.status, { textAlign: 'center' }), order: 3 }}>حالت</div>
      <div className="statement-col-debit" style={{ ...cell(colWidths.debit, { textAlign: 'right' }), order: 4 }}>ڈیبٹ</div>
      <div className="statement-col-credit" style={{ ...cell(colWidths.credit, { textAlign: 'right' }), order: 5 }}>کریڈٹ</div>
      <div className="statement-col-balance" style={{ ...cell(colWidths.balance, { textAlign: 'right' }), order: 6 }}>چلتا بیلنس</div>
    </div>
  );

  /* ── Build render list with carry-forward breaks ─────────────────────────*/
  const segments = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && i % ROWS_PER_PAGE === 0) {
      segments.push({
        type: 'carry-forward',
        balance: rows[i - 1].bal,
        status: rows[i - 1].status,
        key: `cf-${i}`,
      });
      segments.push({ type: 'header', key: `hdr-${i}` });
    }
    segments.push({ type: 'row', row: rows[i], key: `row-${i}` });
  }

  /* ── Plain, dense uniform font family ────────────────────────────────────*/
  const plainFont = "'Segoe UI', 'Noto Sans Arabic', Tahoma, Arial, sans-serif";

  return (
    <div
      id="urdu-statement-print-area"
      className={`bg-white ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: '100%',
        boxSizing: 'border-box',
        color: '#000',
        fontFamily: plainFont,
        margin: 0,
        padding: 0,
      }}
    >
      {/* ── Header Block: Flat, dense, uniform hierarchy (Reference Style) ── */}
      <div
        className="print-area-inner"
        style={{
          paddingBottom: '4px',
          marginBottom: '4px',
          width: '100%',
          boxSizing: 'border-box',
          color: '#000',
        }}
      >
        {/* Business owner name — uniform small plain text */}
        <div
          className="statement-header-line"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: '10px',
            fontWeight: 600,
            marginBottom: '1px',
            color: '#000',
            width: '100%',
          }}
        >
          <span>{legalName}</span>
        </div>

        {/* Email */}
        <div
          className="statement-header-line"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            fontSize: '9px',
            color: '#000',
            marginBottom: '4px',
            gap: '4px',
            width: '100%',
          }}
        >
          <span dir="ltr" style={{ unicodeBidi: 'embed' }}>
            {party.email || 'sundermb3@gmail.com'}
          </span>
          <span>:ای میل</span>
        </div>

        {/* Divider line under owner & email */}
        <div style={{ borderBottom: '1px solid #000', width: '100%', marginBottom: '4px' }} />

        {/* Plain centered title inside thin border box matching reference */}
        <div style={{ display: 'block', textAlign: 'center', margin: '3px 0', width: '100%' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#000',
              border: '1px solid #000',
              padding: '1px 16px',
              display: 'inline-block',
              letterSpacing: '0.02em',
            }}
          >
            پارٹی اسٹیٹمنٹ
          </span>
        </div>

        {/* Meta rows — flat, dense, plain weight */}
        {[
          { label: 'پارٹی کا نام:', value: party.name, ltr: false },
          { label: 'رابطہ نمبر:', value: party.phone || '—', ltr: true },
          { label: 'پتہ:', value: party.city || '—', ltr: false },
          { label: 'مدت:', value: periodText, ltr: false },
        ].map(({ label, value, ltr }) => (
          <div
            key={label}
            className="statement-header-line"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              fontSize: '9px',
              marginBottom: '1px',
              gap: '4px',
              color: '#000',
              width: '100%',
            }}
          >
            {ltr ? (
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                {value}
              </span>
            ) : (
              <span>{value}</span>
            )}
            <span style={{ fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Fixed Width Table for Ledger Transactions ─────────────────────────*/}
      <table
        className="urdu-statement-table"
        style={{
          tableLayout: 'fixed',
          width: '100%',
          borderCollapse: 'collapse',
          direction: 'ltr',
          fontSize: '9px',
          color: '#000',
          boxSizing: 'border-box',
        }}
      >
        <colgroup>
          <col style={{ width: '18%' }} /> {/* Type */}
          <col style={{ width: '14%' }} /> {/* Bill No */}
          <col style={{ width: '12%' }} /> {/* Status */}
          <col style={{ width: '18%' }} /> {/* Debit */}
          <col style={{ width: '18%' }} /> {/* Credit */}
          <col style={{ width: '20%' }} /> {/* Balance */}
        </colgroup>
        <thead>
          <tr
            style={{
              fontSize: '8.5px',
              fontWeight: 700,
              borderBottom: '1px solid #000',
              borderTop: '1px solid #000',
              backgroundColor: '#f5f5f5',
              color: '#000',
            }}
          >
            <th style={{ padding: '3px 4px', textAlign: 'left', fontWeight: 700 }}>لین دین کی قسم</th>
            <th style={{ padding: '3px 4px', textAlign: 'left', fontWeight: 700 }}>بل نمبر</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 700 }}>حالت</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>ڈیبٹ</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>کریڈٹ</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>چلتا بیلنس</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => {
            if (seg.type === 'header') {
              return (
                <tr
                  key={seg.key}
                  style={{
                    fontSize: '8.5px',
                    fontWeight: 700,
                    borderBottom: '1px solid #000',
                    borderTop: '1px solid #000',
                    backgroundColor: '#f5f5f5',
                    color: '#000',
                  }}
                >
                  <th style={{ padding: '3px 4px', textAlign: 'left', fontWeight: 700 }}>لین دین کی قسم</th>
                  <th style={{ padding: '3px 4px', textAlign: 'left', fontWeight: 700 }}>بل نمبر</th>
                  <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 700 }}>حالت</th>
                  <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>ڈیبٹ</th>
                  <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>کریڈٹ</th>
                  <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>چلتا بیلنس</th>
                </tr>
              );
            }

            if (seg.type === 'carry-forward') {
              return (
                <tr
                  key={seg.key}
                  style={{
                    borderTop: '1px solid #000',
                    borderBottom: '1px solid #000',
                    fontWeight: 700,
                    fontSize: '8.5px',
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    color: '#000',
                  }}
                >
                  <td colSpan={6} style={{ padding: '2px 4px', textAlign: 'right', direction: 'rtl' }}>
                    آگے منتقل:{' '}
                    <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace', margin: '0 4px' }}>
                      {formatRs(seg.balance)}
                    </span>{' '}
                    {seg.status}
                  </td>
                </tr>
              );
            }

            // type === 'row'
            const row = seg.row;
            return (
              <React.Fragment key={seg.key}>
                {/* Main Data Row */}
                <tr
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'left', fontWeight: 600 }}>
                    {row.transType}
                  </td>
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'left' }}>
                    <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace', fontSize: '8.5px' }}>
                      {row.billNo || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'center', fontSize: '8.5px' }}>
                    {row.status || '—'}
                  </td>
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'right' }}>
                    <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                      {row.dr > 0 ? formatRs(row.dr) : ''}
                    </span>
                  </td>
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'right' }}>
                    <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                      {row.cr > 0 ? formatRs(row.cr) : ''}
                    </span>
                  </td>
                  <td style={{ padding: '2px 4px 1px 4px', textAlign: 'right', fontWeight: 600 }}>
                    <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                      {formatRs(Math.abs(row.bal))}
                    </span>{' '}
                    <span style={{ fontWeight: 400, fontSize: '8px' }}>{row.status}</span>
                  </td>
                </tr>

                {/* Sub-row for detail note & date */}
                <tr
                  style={{
                    borderBottom: '1px dotted #888',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <td colSpan={6} style={{ padding: '0 4px 2px 4px' }}>
                    {row.note && (
                      <div
                        className="statement-detail-line"
                        style={{
                          direction: 'rtl',
                          textAlign: 'right',
                          fontSize: '8.5px',
                          color: '#000',
                          lineHeight: 1.25,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>تفصیل: </span>
                        <span>{row.note}</span>
                      </div>
                    )}
                    <div
                      className="statement-date-line"
                      style={{
                        direction: 'ltr',
                        textAlign: 'left',
                        fontSize: '8.5px',
                        color: '#000',
                        lineHeight: 1.25,
                      }}
                    >
                      <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                        {fmtDate(row.date)}
                      </span>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr
            className="statement-total-row"
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000',
              color: '#000',
            }}
          >
            <td style={{ padding: '4px', textAlign: 'left', fontWeight: 700 }}>کل</td>
            <td style={{ padding: '4px' }}></td>
            <td style={{ padding: '4px' }}></td>
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700 }}>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                {formatRs(totalDebit)}
              </span>
            </td>
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700 }}>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                {formatRs(totalCredit)}
              </span>
            </td>
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700 }}>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
                {formatRs(Math.abs(finalBalance))}
              </span>{' '}
              <span style={{ fontWeight: 400, fontSize: '8px' }}>{finalStatus}</span>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Closing Footer Block (Monochrome Plain Aesthetic) ───────────────*/}
      <PrintFooter
        lang="ur"
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        closingBalance={finalBalance}
        printedBy={printedBy}
      />
    </div>
  );
}
