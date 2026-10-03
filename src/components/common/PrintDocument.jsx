import React from 'react';
import { Printer, Info } from 'lucide-react';
import Button from '../ui/Button';
import logoImg from '../../assets/logo.png';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * Format timestamp for the audit line: e.g. "30 Sep 2026, 11:45 AM"
 */
function formatAuditTimestamp(d) {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mmm = months[dt.getMonth()];
  const yyyy = dt.getFullYear();
  let h = dt.getHours();
  const m = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd} ${mmm} ${yyyy}, ${h}:${m} ${ampm}`;
}

/**
 * Helper to sanitize any warehouse name and guarantee "Warehouse" spelling
 */
export function sanitizeWarehouse(name) {
  if (!name) return 'Warehouse 1';
  return String(name).replace(/wirehouse/gi, 'Warehouse');
}

/**
 * PrintDocument — Unified A4 Printable Transaction Layout
 * 
 * Standard wrapper for all six transaction types:
 * 1. Purchase Invoice
 * 2. Sale Invoice
 * 3. Receipt Voucher
 * 4. Payment Voucher
 * 5. Material Issue Slip
 * 6. Production Run Slip
 * 
 * Features:
 * - Brackets the page from top to bottom (Header + Metadata + Details + Closing Summary + Audit + Signatures)
 * - Zero top margin gap: starts immediately at the 12mm page margin (no vertical centering gap)
 * - Working signature lines with dedicated blank signing space
 * - Standardized audit trail (Printed on, Printed by, System ID)
 * - Screen-only toolbar with Print button and browser "Headers & footers" settings tip
 */
export default function PrintDocument({
  id = 'print-document-area',
  title = 'TRANSACTION DOCUMENT',
  documentNo = '',
  date = '',
  metadata = [], // Array of { label, value, span? }
  children,
  summary = null,
  signatures = [],
  printedBy = '',
  printTimestamp = '',
  printButtonText = '',
  actionTitle = '',
  onPrint = null,
  className = '',
}) {
  const { profile, defaultLogo } = useCompanyProfile();
  const timestamp = formatAuditTimestamp(printTimestamp);

  const effectiveLogo = profile?.logoUrl || defaultLogo || logoImg;
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const tagline = profile?.tagline || 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant';
  const address = profile?.address || 'Faisalabad, Pakistan';
  const phone = profile?.phone || '+92 300 1234567';
  const effectivePrintedBy = printedBy && printedBy !== 'Shahid Yaseen' ? printedBy : (legalName || 'Shahid Yaseen');

  // Default signature fallbacks if caller does not specify (standard 3-column pattern)
  const baseSignatures = signatures && signatures.length > 0 ? signatures : [
    { label: 'Prepared By', sub: 'Accountant / Staff' },
    { label: 'Verified By', sub: 'Accounts Department' },
    { label: 'Authorized Signature', sub: `Proprietor / ${legalName}` },
  ];

  const resolvedSignatures = baseSignatures.map(sig => ({
    ...sig,
    sub: sig.sub ? sig.sub.replace('Shahid Yaseen', legalName) : sig.sub,
  }));

  return (
    <div
      id={id}
      className={`print-document print-area w-full bg-white text-black p-4 sm:p-6 print:p-0 print:m-0 ${className}`}
      style={{ boxSizing: 'border-box' }}
    >


      {/* ── Screen-only Action Toolbar ─────────────────────────────── */}
      <div className="pb-3 mb-4 border-b border-[#E0DBD3] no-print space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
              Document View
            </span>
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              {actionTitle || `${title} — ${documentNo || 'Preview'}`}
            </h3>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={onPrint || (() => window.print())}
          >
            {printButtonText || `Print ${title.toLowerCase().includes('voucher') || title.toLowerCase().includes('slip') ? title : 'Invoice'}`}
          </Button>
        </div>

        {/* Tip for browser print settings: Scale and Headers & Footers */}
        <div className="flex items-center gap-2 text-[11px] text-amber-900 bg-amber-50/90 px-3 py-1.5 rounded-lg border border-amber-200">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Print Settings Tip:</strong> In print dialog under <strong>More settings</strong>, ensure <strong>Scale</strong> is <strong>Default (100%)</strong> and turn off <strong>&quot;Headers and footers&quot;</strong>.
          </span>
        </div>
      </div>

      {/* ── Printable Header Block (Production Slip Reference Standard) ── */}
      <div className="print-header-block border-b-2 border-[#1E3A5F] pb-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Company Branding */}
          <div className="flex items-center gap-4">
            <img
              src={effectiveLogo}
              alt={`${legalName} Logo`}
              className="h-16 w-auto object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-xl font-black text-[#1E3A5F] uppercase tracking-wide leading-tight">
                {legalName}
              </h1>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                {tagline}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {address}{phone ? ` • Tel: ${phone}` : ''}
              </p>
            </div>
          </div>

          {/* Document Type Badge & Doc Details */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider bg-[#FAF9F7] px-3.5 py-1.5 rounded border border-[#1E3A5F]/20 inline-block">
              {title}
            </div>
            {documentNo && (
              <div className="text-xs font-mono font-bold text-[#1E3A5F] mt-1.5">
                {title.toLowerCase().includes('slip') ? 'Slip #:' : 'Doc #:'} {documentNo}
              </div>
            )}
            {date && (
              <div className="text-xs text-gray-700 font-medium mt-0.5">
                Date: {date}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-Column Metadata Info Card (Production Slip Reference Standard) ── */}
      {metadata && metadata.length > 0 && (
        <div
          className={`grid gap-4 text-xs bg-[#FAF9F7] p-3.5 rounded-lg border border-[#D1D5DB] mb-5 ${
            metadata.length === 1
              ? 'grid-cols-1'
              : 'grid-cols-2'
          }`}
        >
          {metadata.map((item, idx) => {
            const cleanVal =
              typeof item.value === 'string'
                ? sanitizeWarehouse(item.value)
                : item.value;
            return (
              <div key={idx} className={item.span ? `col-span-${item.span}` : ''}>
                <span className="text-gray-500 font-bold block text-[11px] uppercase tracking-wider">
                  {item.label}
                </span>
                <div className={`font-bold text-sm mt-0.5 break-words ${item.color || 'text-[#1E3A5F]'}`}>
                  {cleanVal || '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Middle Content (Line items / metrics / details) ─────────── */}
      <div className="w-full mb-4">
        {children}
      </div>

      {/* ── Closing Summary Block ───────────────────────────────────── */}
      {summary && (
        <div className="print-summary-block w-full mb-4" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          {summary}
        </div>
      )}

      {/* ── Document Closing Footer (Production Slip Reference Standard) ─ */}
      <div
        className="print-footer-block w-full pt-3 mt-4"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        {/* Audit Line */}
        <div className="flex items-center justify-between text-[8.5px] text-gray-600 border-t border-b border-gray-300 py-1.5 mb-6">
          <div className="flex items-center gap-2">
            <span>Printed on: <strong className="font-mono">{timestamp}</strong></span>
            <span>·</span>
            <span>Printed by: <strong>{effectivePrintedBy}</strong></span>
            <span>·</span>
            <span>System: <strong>Yaseen Merchants Offline Accounting</strong></span>
          </div>
          <div className="font-medium text-gray-500">
            {address}
          </div>
        </div>

        {/* Clean 3-Column Signature Block */}
        <div className="grid grid-cols-3 gap-6 text-center text-xs text-gray-700 mt-2">
          {resolvedSignatures.map((sig, idx) => (
            <div key={idx} className="flex flex-col items-center">
              {/* Working signature line with signing space */}
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-[11px]">
                {sig.label}
              </div>
              {sig.sub && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {sig.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
