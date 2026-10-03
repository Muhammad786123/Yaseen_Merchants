import React from 'react';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * PrintFooter — Unified Closing Footer Block for all Statements & Ledgers.
 *
 * Implements:
 * 1. Restated Summary Stats Box (Total Debit, Total Credit, Closing Balance)
 * 2. Audit & Print Metadata (Printed on: date/time, Printed by: user, System info)
 * 3. Dual Signature Block (Prepared By: ___________, Authorized By: ___________)
 *
 * Supports two distinct styles via the `lang` prop:
 * - lang="en": Bordered-grid aesthetic matching the English Statement of Account
 * - lang="ur": Clean borderless aesthetic matching the legacy PERBALACC Urdu Party Statement
 *
 * Guaranteed to only appear ONCE at the very end of multi-page prints via
 * `pageBreakInside: avoid; breakInside: avoid;`.
 */

function fmtDateEn(d) {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt)) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mmm = months[dt.getMonth()];
  const yy = String(dt.getFullYear()).slice(2);
  let h = dt.getHours();
  const m = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}-${mmm}-${yy} ${h}:${m} ${ampm}`;
}

function fmtDateUr(d) {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt)) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  let h = dt.getHours();
  const m = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${h}:${m} ${ampm}`;
}

function fmtAmt(n) {
  if (!n || isNaN(n) || n === 0) return '0.00';
  return Number(Math.abs(n)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PrintFooter({
  lang = 'en', // 'en' | 'ur'
  totalDebit = 0,
  totalCredit = 0,
  closingBalance = 0,
  printedBy = '',
  dateTime = '',
  className = '',
}) {
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const effectivePrintedBy = printedBy && printedBy !== 'Shahid Yaseen' ? printedBy : (legalName || 'Shahid Yaseen');
  const isUrdu = lang === 'ur';
  const timestamp = dateTime || (isUrdu ? fmtDateUr() : fmtDateEn());

  /* ── 1. URDU BORDERLESS FOOTER (Monochrome Plain Reference Style) ────── */
  if (isUrdu) {
    const balSign = closingBalance > 0 ? '(کریڈٹ)' : closingBalance < 0 ? '(ڈیبٹ)' : '';
    const plainFont = "'Segoe UI', 'Noto Sans Arabic', Tahoma, Arial, sans-serif";
    return (
      <div
        className={`print-footer-ur ${className}`}
        dir="rtl"
        style={{
          marginTop: '14px',
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'right',
          color: '#000',
          fontFamily: plainFont,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Restated Summary Box — Clean plain aesthetic matching PERBALACC */}
        <div
          style={{
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            padding: '5px 8px',
            marginBottom: '8px',
            backgroundColor: 'transparent',
            boxSizing: 'border-box',
            width: '100%',
            color: '#000',
          }}
        >
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: '#000',
              marginBottom: '3px',
              paddingRight: '4px',
            }}
          >
            خلاصہ اسٹیٹمنٹ / Statement Summary
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '33.3% 33.3% 33.3%',
              fontSize: '9px',
              padding: '2px 4px',
              lineHeight: 1.35,
              boxSizing: 'border-box',
              color: '#000',
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>کل ڈیبٹ (Total Dr): </span>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace', fontWeight: 700 }}>
                {fmtAmt(totalDebit)} Rs
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>کل کریڈٹ (Total Cr): </span>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace', fontWeight: 700 }}>
                {fmtAmt(totalCredit)} Rs
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>آخری بقایا (Closing): </span>
              <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace', fontWeight: 700 }}>
                {fmtAmt(Math.abs(closingBalance))} Rs
              </span>{' '}
              <span style={{ fontSize: '8.5px', fontWeight: 600 }}>{balSign}</span>
            </div>
          </div>
        </div>

        {/* Audit / Metadata line */}
        <div
          style={{
            fontSize: '8px',
            color: '#000',
            borderBottom: '1px dashed #666',
            paddingBottom: '3px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span>پرنٹ کی تاریخ: </span>
            <span dir="ltr" style={{ unicodeBidi: 'embed', fontFamily: 'monospace' }}>
              {timestamp}
            </span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>پرنٹ کرنے والا: </span>
            <span style={{ fontWeight: 600 }}>{effectivePrintedBy}</span>
          </div>
          <div>
            <span>{legalName} — {profile?.address || 'فیصل آباد'}</span>
          </div>
        </div>

        {/* Side-by-side Dual Signature Block (Plain lines) */}
        <table
          className="sig-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: 'none',
            marginTop: '16px',
          }}
        >
          <tbody>
            <tr>
              {/* Right in RTL: تیار کردہ */}
              <td
                style={{
                  width: '42%',
                  textAlign: 'center',
                  border: 'none',
                  verticalAlign: 'bottom',
                  padding: '0 10px',
                }}
              >
                <div
                  style={{
                    borderTop: '1px solid #000',
                    paddingTop: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  تیار کردہ / Prepared By
                </div>
                <div style={{ fontSize: '7.5px', color: '#000' }}>(اکاؤنٹنٹ / مجاز عملہ)</div>
              </td>

              {/* Spacer */}
              <td style={{ width: '16%', border: 'none' }}></td>

              {/* Left in RTL: منظور شدہ */}
              <td
                style={{
                  width: '42%',
                  textAlign: 'center',
                  border: 'none',
                  verticalAlign: 'bottom',
                  padding: '0 10px',
                }}
              >
                <div
                  style={{
                    borderTop: '1px solid #000',
                    paddingTop: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  منظور شدہ / Authorized Signature
                </div>
                <div style={{ fontSize: '7.5px', color: '#000' }}>(پروپرائیٹر / شاہد یاسین)</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  /* ── 2. ENGLISH BORDERED FOOTER ────────────────────────────────────────── */
  const balSignEn = closingBalance >= 0 ? '(Cr)' : '(Dr)';
  return (
    <div
      className={`print-footer-en ${className}`}
      dir="ltr"
      style={{
        marginTop: '14px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left',
        color: '#000',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      {/* Restated Summary Box — Bordered Grid Aesthetic */}
      <div
        style={{
          border: '1px solid #222',
          marginBottom: '10px',
          backgroundColor: '#fff',
        }}
      >
        <div
          style={{
            backgroundColor: '#f5f4f0',
            borderBottom: '1px solid #222',
            padding: '3px 8px',
            fontSize: '9px',
            fontWeight: 800,
            color: '#1E3A5F',
            letterSpacing: '0.04em',
          }}
        >
          STATEMENT OF ACCOUNT SUMMARY
        </div>

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
              {/* Total Debit */}
              <td
                style={{
                  width: '33.33%',
                  padding: '5px 8px',
                  borderRight: '1px solid #222',
                  borderBottom: 'none',
                  verticalAlign: 'middle',
                }}
              >
                <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>
                  Total Debit (Dr)
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#c0392b', marginTop: '1px' }}>
                  Rs. {fmtAmt(totalDebit)}
                </div>
              </td>

              {/* Total Credit */}
              <td
                style={{
                  width: '33.33%',
                  padding: '5px 8px',
                  borderRight: '1px solid #222',
                  borderBottom: 'none',
                  verticalAlign: 'middle',
                }}
              >
                <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>
                  Total Credit (Cr)
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1a6b2e', marginTop: '1px' }}>
                  Rs. {fmtAmt(totalCredit)}
                </div>
              </td>

              {/* Closing Balance */}
              <td
                style={{
                  width: '33.34%',
                  padding: '5px 8px',
                  border: 'none',
                  verticalAlign: 'middle',
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>
                  Closing Balance
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 900,
                    color: closingBalance >= 0 ? '#1a6b2e' : '#c0392b',
                    marginTop: '1px',
                  }}
                >
                  Rs. {fmtAmt(Math.abs(closingBalance))} {balSignEn}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Audit / Metadata line */}
      <div
        style={{
          fontSize: '8px',
          color: '#666',
          borderBottom: '1px dashed #ccc',
          paddingBottom: '3px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span>Printed on: {timestamp}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>Printed by: {effectivePrintedBy}</span>
        </div>
        <div>
          <span>System: Yaseen Merchants Offline Accounting</span>
        </div>
      </div>

      {/* Side-by-side Dual Signature Block (Bordered lines) */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          marginTop: '20px',
        }}
      >
        <tbody>
          <tr>
            {/* Left: Prepared By */}
            <td
              style={{
                width: '42%',
                textAlign: 'center',
                border: 'none',
                verticalAlign: 'bottom',
                padding: '0 15px',
              }}
            >
              <div
                style={{
                  borderTop: '1px solid #222',
                  paddingTop: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#222',
                }}
              >
                Prepared By: ___________________________
              </div>
              <div style={{ fontSize: '7.5px', color: '#666' }}>(Accountant / Data Operator)</div>
            </td>

            {/* Spacer */}
            <td style={{ width: '16%', border: 'none' }}></td>

            {/* Right: Authorized By */}
            <td
              style={{
                width: '42%',
                textAlign: 'center',
                border: 'none',
                verticalAlign: 'bottom',
                padding: '0 15px',
              }}
            >
              <div
                style={{
                  borderTop: '1px solid #222',
                  paddingTop: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#222',
                }}
              >
                Authorized By: ___________________________
              </div>
              <div style={{ fontSize: '7.5px', color: '#666' }}>(Proprietor / {legalName})</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
