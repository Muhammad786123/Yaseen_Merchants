import React from 'react';
import { Printer, Info } from 'lucide-react';
import Button from '../ui/Button';
import logoImg from '../../assets/logo.png';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

import { safePrint } from '../../utils/printUtils.js';

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
      dir="ltr"
      className={`print-document print-area w-full bg-white text-black p-3 sm:p-5 print:p-0 print:m-0 ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* ── Screen-only Action Toolbar ─────────────────────────────── */}
      <div className="pb-2 mb-3 border-b border-[#E0DBD3] no-print">
        <div className="flex justify-between items-center">
          <div className="text-start">
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
            onClick={onPrint || safePrint}
          >
            {printButtonText || `Print ${title.toLowerCase().includes('voucher') || title.toLowerCase().includes('slip') ? title : 'Invoice'}`}
          </Button>
        </div>
      </div>

      {/* ── Printable Header Block (Production Slip Reference Standard) ── */}
      <div className="print-header-block border-b-2 border-[#1E3A5F] pb-3 mb-3">
        <div className="flex items-start justify-between gap-4">
          {/* Company Branding (Left in LTR) */}
          <div className="flex items-center gap-3 text-start">
            <img
              src={effectiveLogo}
              alt={`${legalName} Logo`}
              className="h-12 w-auto object-contain flex-shrink-0"
            />
            <div className="text-start">
              <h1 className="text-xl font-black text-[#1E3A5F] uppercase tracking-wide leading-tight print-company-name">
                {legalName}
              </h1>
              <p className="text-xs text-gray-700 font-medium mt-0.5 print-note-text">
                {tagline}
              </p>
              <p className="text-[11px] text-gray-600 mt-0.5 print-note-text">
                {address}{phone ? ` • Tel: ${phone}` : ''}
              </p>
            </div>
          </div>

          {/* Document Type Badge & Doc Details (Right in LTR) */}
          <div className="text-end flex-shrink-0">
            <div className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider bg-[#FAF9F7] px-3 py-1 rounded border border-[#1E3A5F]/20 inline-block print-statement-title">
              {title}
            </div>
            {documentNo && (
              <div className="text-xs font-mono font-bold text-[#1E3A5F] mt-1 print-note-text" dir="ltr">
                {title.toLowerCase().includes('slip') ? 'Slip #:' : 'Doc #:'} {documentNo}
              </div>
            )}
            {date && (
              <div className="text-xs text-gray-700 font-medium mt-0.5 print-note-text" dir="ltr">
                Date: {date}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-Column Metadata Info Card (Production Slip Reference Standard) ── */}
      {metadata && metadata.length > 0 && (
        <div
          className={`grid gap-3 text-xs bg-[#FAF9F7] p-2.5 rounded-lg border border-[#D1D5DB] mb-3 ${
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
                <span className="text-gray-500 font-bold block text-[10px] uppercase tracking-wider text-start">
                  {item.label}
                </span>
                <div className={`font-bold text-sm mt-0.5 break-words text-start ${item.color || 'text-[#1E3A5F]'}`}>
                  {cleanVal || '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Middle Content (Line items / metrics / details) ─────────── */}
      <div className="w-full mb-3">
        {children}
      </div>

      {/* ── Closing Summary Block ───────────────────────────────────── */}
      {summary && (
        <div className="print-summary-block w-full mb-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          {summary}
        </div>
      )}

      {/* ── Document Closing Footer (Production Slip Reference Standard) ─ */}
      <div
        className="print-footer-block w-full pt-2 mt-3"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        {/* Audit Line */}
        <div className="flex items-center justify-between text-[11px] text-gray-600 border-t border-b border-gray-300 py-1.5 mb-3 print-note-text">
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
              <div className="w-40 max-w-full h-6 border-b-2 border-gray-600 mb-1" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-xs">
                {sig.label}
              </div>
              {sig.sub && (
                <div className="text-[11px] text-gray-500 mt-0.5 print-note-text">
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
