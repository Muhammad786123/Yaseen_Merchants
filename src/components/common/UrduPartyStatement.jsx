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
    if (num === null || num === undefined || isNaN(num) || Number(num) === 0) return '0 Rs';
    const n = Number(Math.abs(num));
    const hasDecimals = n % 1 !== 0;
    return `${n.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })} Rs`;
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

    let transType = 'وصولی (In Payment)';
    const t = (r.type || '').toLowerCase();
    if (dr > 0 && cr === 0) {
      transType = 'ادائیگی (Out Payment)';
    } else if (cr > 0 && dr === 0) {
      transType = 'وصولی (In Payment)';
    } else if (t.includes('purchase')) {
      transType = 'خریداری (Purchase)';
    } else if (t.includes('sale')) {
      transType = 'فروخت (Sale)';
    } else if (t.includes('cash given') || t.includes('material issue') || t.includes('payment')) {
      transType = 'ادائیگی (Payment)';
    } else if (t.includes('cash received') || t.includes('receipt')) {
      transType = 'وصولی (Receipt)';
    } else if (t.includes('journal')) {
      transType = 'جرنل (Journal)';
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
    const status = bal > 0 ? 'Cr' : bal < 0 ? 'Dr' : '';

    return { ...r, transType, note, dr, cr, bal, status };
  });

  const finalBalance = rows.length > 0 ? rows[rows.length - 1].bal : openingBalance;
  const finalStatus = finalBalance > 0 ? 'Cr' : finalBalance < 0 ? 'Dr' : '';

  /* ── Column widths in exact Reference LTR order:
   *   Type → Bill No. → Status → Debit → Credit → Balance
   * ────────────────────────────────────────────────────────────────────────*/
  const colWidths = {
    type: '18%',     // Type
    billNo: '14%',   // Bill / Voucher No
    status: '10%',   // Status
    debit: '18%',    // Debit
    credit: '18%',   // Credit
    balance: '22%',  // Balance
  };

  const cell = (width, extra = {}) => ({
    flex: `0 0 ${width}`,
    width: width,
    maxWidth: width,
    padding: '4px 6px',
    overflow: 'visible',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    color: '#000',
    ...extra,
  });

  // Row style in RTL reading flow
  const rowFlexStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    direction: 'rtl',
    fontSize: '11pt',
    color: '#000',
    lineHeight: 1.4,
    gap: '8px',
    boxSizing: 'border-box',
  };

  const colHeaderStyle = {
    ...rowFlexStyle,
    borderBottom: '1px solid #000',
    borderTop: '1px solid #000',
    padding: '6px 0',
    marginBottom: '2px',
    color: '#000',
    backgroundColor: '#f5f5f5',
  };

  const ColumnHeaders = () => (
    <div className="statement-col-header" style={colHeaderStyle}>
      <div className="statement-col-type font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.type, { textAlign: 'start' }), order: 1 }}>قسم</div>
      <div className="statement-col-billno font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.billNo, { textAlign: 'start' }), order: 2 }}>واؤچر نمبر</div>
      <div className="statement-col-status font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.status, { textAlign: 'center' }), order: 3 }}>حالت</div>
      <div className="statement-col-debit font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.debit, { textAlign: 'start' }), order: 4 }}>بنام</div>
      <div className="statement-col-credit font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.credit, { textAlign: 'start' }), order: 5 }}>جمع</div>
      <div className="statement-col-balance font-urdu font-bold text-[22px] print:text-[14pt]" style={{ ...cell(colWidths.balance, { textAlign: 'start' }), order: 6 }}>بیلنس</div>
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

  /* ── Nastaleeq font family with fallbacks ────────────────────────────*/
  const plainFont = "var(--font-urdu), 'Segoe UI', 'Noto Sans Arabic', Tahoma, Arial, sans-serif";

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
          marginBottom: '6px',
          width: '100%',
          boxSizing: 'border-box',
          color: '#000',
        }}
      >
        {/* Business owner name (Company Name: 22pt bold) */}
        <div
          className="statement-header-line print-company-name"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: '22pt',
            fontWeight: 700,
            marginBottom: '2px',
            color: '#000',
            width: '100%',
          }}
        >
          <span>{legalName}</span>
        </div>

        {/* Email */}
        <div
          className="statement-header-line print-note-text"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            fontSize: '10pt',
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
        <div style={{ borderBottom: '1px solid #000', width: '100%', marginBottom: '6px' }} />

        {/* Plain centered title */}
        <div style={{ display: 'block', textAlign: 'center', margin: '4px 0', width: '100%' }}>
          <div
            className="font-urdu font-bold text-[24px] print:text-[18pt] text-black leading-relaxed"
          >
            اسٹیٹمنٹ آف اکاؤنٹ
          </div>
          <div
            className="text-[14px] print:text-[10pt] font-bold text-gray-700 tracking-wider"
          >
            STATEMENT OF ACCOUNT
          </div>
        </div>

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
            {party.urduName || party.nameUrdu || party.name}
          </div>
          {(party.englishName || party.name) && (
            <div
              className="font-bold text-[22px] print:text-[14pt] text-black mt-1"
              dir="ltr"
            >
              {party.englishName || party.name}
            </div>
          )}
          <div
            className="text-[18px] print:text-[12pt] font-semibold text-gray-800 mt-1 flex items-center justify-center gap-6"
            dir="rtl"
          >
            <span>کوڈ: <strong className="num text-[18px] print:text-[12pt]">{party.code || party.id || '—'}</strong></span>
            {party.phone && (
              <span>فون: <strong className="num text-[18px] print:text-[12pt]">{party.phone}</strong></span>
            )}
          </div>
        </div>

        {[
          { label: 'پتہ:', value: party.city || '—', ltr: false },
          { label: 'مدت:', value: periodText, ltr: false },
        ].map(({ label, value, ltr }) => (
          <div
            key={label}
            className="statement-header-line print-note-text"
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              fontSize: '18px',
              marginBottom: '2px',
              gap: '6px',
              color: '#000',
              width: '100%',
              direction: 'rtl',
            }}
          >
            <span className="font-urdu font-bold text-[18px] print:text-[12pt]">{label}</span>
            {ltr ? (
              <span dir="ltr" className="num text-[18px] print:text-[12pt]">
                {value}
              </span>
            ) : (
              <span className="font-urdu text-[18px] print:text-[12pt]">{value}</span>
            )}
          </div>
        ))}

        {/* Opening Balance Line */}
        <div
          style={{
            fontSize: '18px',
            margin: '6px 0',
            fontWeight: 700,
            textAlign: 'right',
            direction: 'rtl',
          }}
        >
          <span className="font-urdu font-bold text-[22px] print:text-[14pt]">سابقہ بیلنس (Opening Balance): </span>
          <span className="num font-bold text-[22px] print:text-[14pt]">
            {openingBalance !== 0
              ? `${formatRs(openingBalance)} ${openingBalance > 0 ? 'Cr' : 'Dr'}`
              : '0 Rs'}
          </span>
        </div>
      </div>

      {/* ── Fixed Width Table for Ledger Transactions ─────────────────────────*/}
      <table
        className="urdu-statement-table statement-table classic-ledger-table"
        dir="rtl"
        style={{
          tableLayout: 'fixed',
          width: '100%',
          borderCollapse: 'collapse',
          direction: 'rtl',
          color: '#000',
          boxSizing: 'border-box',
          border: '1px solid #000',
        }}
      >
        <colgroup>
          <col style={{ width: '18%' }} /> {/* قسم */}
          <col style={{ width: '14%' }} /> {/* واؤچر نمبر */}
          <col style={{ width: '10%' }} /> {/* حالت */}
          <col style={{ width: '18%' }} /> {/* بنام */}
          <col style={{ width: '18%' }} /> {/* جمع */}
          <col style={{ width: '22%' }} /> {/* بیلنس */}
        </colgroup>
        <thead>
          <tr
            style={{
              borderBottom: '1px solid #000',
              borderTop: '1px solid #000',
              backgroundColor: '#f5f5f5',
              color: '#000',
            }}
          >
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>قسم</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>واؤچر نمبر</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'center' }}>حالت</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>بنام</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>جمع</th>
            <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>بیلنس</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => {
            if (seg.type === 'header') {
              return (
                <tr
                  key={seg.key}
                  style={{
                    borderBottom: '1px solid #000',
                    borderTop: '1px solid #000',
                    backgroundColor: '#f5f5f5',
                    color: '#000',
                  }}
                >
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>قسم</th>
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>واؤچر نمبر</th>
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'center' }}>حالت</th>
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>بنام</th>
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>جمع</th>
                  <th className="font-urdu font-bold text-[22px] print:text-[14pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>بیلنس</th>
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
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    color: '#000',
                  }}
                >
                  <td colSpan={6} style={{ padding: '6px 10px', textAlign: 'right', direction: 'rtl' }}>
                    <span className="font-urdu font-bold text-[20px] print:text-[13pt]">آگے منتقل: </span>
                    <span className="num-total" style={{ margin: '0 6px' }}>
                      {formatRs(seg.balance)}
                    </span>{' '}
                    <span className="font-urdu font-bold text-[18px]">{seg.status}</span>
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
                    minHeight: '40px',
                  }}
                >
                  <td className="font-urdu font-bold text-[20px] print:text-[13pt]" style={{ padding: '6px 10px', textAlign: 'start' }}>
                    {row.transType}
                  </td>
                  <td className="num text-start" style={{ padding: '6px 10px', direction: 'ltr' }}>
                    {row.billNo || '—'}
                  </td>
                  <td className="font-urdu font-bold text-[18px] print:text-[12pt] text-center" style={{ padding: '6px 10px' }}>
                    {row.status || '—'}
                  </td>
                  <td className="num text-start" style={{ padding: '6px 10px', direction: 'ltr' }}>
                    {row.dr > 0 ? formatRs(row.dr) : ''}
                  </td>
                  <td className="num text-start" style={{ padding: '6px 10px', direction: 'ltr' }}>
                    {row.cr > 0 ? formatRs(row.cr) : ''}
                  </td>
                  <td className="num-total text-start" style={{ padding: '6px 10px', direction: 'ltr' }}>
                    {formatRs(Math.abs(row.bal))}
                    {row.status ? ` ${row.status}` : ''}
                  </td>
                </tr>

                {/* Sub-row for detail note & date */}
                <tr
                  style={{
                    borderBottom: '1px solid #000',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <td colSpan={6} style={{ padding: '4px 10px 8px 10px' }}>
                    {row.note && (
                      <div
                        className="statement-detail-line font-urdu text-[20px] print:text-[13pt] leading-loose text-black"
                        style={{
                          direction: 'rtl',
                          textAlign: 'start',
                        }}
                      >
                        <span className="font-bold">تفصیل: </span>
                        <span>{row.note}</span>
                      </div>
                    )}
                    <div
                      className="statement-date-line flex items-center gap-2 mt-1"
                      style={{
                        direction: 'rtl',
                        textAlign: 'start',
                      }}
                    >
                      <span className="font-urdu font-bold text-[18px] print:text-[12pt]">تاریخ: </span>
                      <span className="num text-[18px] print:text-[12pt]" style={{ direction: 'ltr' }}>
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
            className="statement-total-row bg-white font-bold"
            style={{
              borderTop: '2px solid #000',
              borderBottom: '2px solid #000',
              color: '#000',
            }}
          >
            <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'start' }}>
              <span className="font-urdu font-bold text-[22px] print:text-[14pt]">میزان کل (ٹوٹل)</span>
            </td>
            <td className="num-total text-start" style={{ padding: '8px 10px', direction: 'ltr', color: '#b71c1c' }}>
              {formatRs(totalDebit)}
            </td>
            <td className="num-total text-start" style={{ padding: '8px 10px', direction: 'ltr' }}>
              {formatRs(totalCredit)}
            </td>
            <td className="num-total text-start" style={{ padding: '8px 10px', direction: 'ltr' }}>
              {formatRs(Math.abs(finalBalance))}
              {finalStatus ? ` ${finalStatus}` : ''}
            </td>
          </tr>
        </tfoot>
      </table>
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
