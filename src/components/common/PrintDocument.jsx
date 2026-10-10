import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
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
 * Standard wrapper for all transaction print previews:
 * - Fit to Page (default) scales entire A4 page to fit window/modal height
 * - Fit to Width scales document to fit window width
 * - Zoom controls (50% to 150%)
 * - Standardized audit trail & signatures
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

  // Print preview zoom & fit controls
  const containerRef = useRef(null);
  const docRef = useRef(null);
  const [fitMode, setFitMode] = useState('page'); // 'page' | 'width' | 'custom'
  const [zoomPercent, setZoomPercent] = useState(100);
  const [docHeight, setDocHeight] = useState(0);

  const calculateFitScale = useCallback((mode = fitMode) => {
    if (!containerRef.current || !docRef.current) return;
    const container = containerRef.current;
    const doc = docRef.current;

    const availWidth = container.clientWidth - 32;
    const availHeight = container.clientHeight - 32;
    const dWidth = doc.offsetWidth || 820;
    const dHeight = doc.offsetHeight || 1050;

    setDocHeight(dHeight);

    if (dWidth <= 0 || availWidth <= 0) return;

    if (mode === 'width') {
      const scaleW = availWidth / dWidth;
      const pct = Math.max(50, Math.min(150, Math.round(scaleW * 100)));
      setZoomPercent(pct);
    } else if (mode === 'page') {
      const scaleW = availWidth / dWidth;
      const scaleH = availHeight > 100 ? availHeight / dHeight : scaleW;
      const scale = Math.min(scaleW, scaleH, 1.0);
      const pct = Math.max(50, Math.min(150, Math.round(scale * 100)));
      setZoomPercent(pct);
    }
  }, [fitMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateFitScale('page');
    }, 60);

    const handleResize = () => {
      if (fitMode !== 'custom') {
        calculateFitScale(fitMode);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFitScale, fitMode]);

  const handleFitPage = () => {
    setFitMode('page');
    calculateFitScale('page');
  };

  const handleFitWidth = () => {
    setFitMode('width');
    calculateFitScale('width');
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoomPercent((prev) => Math.min(150, prev + 10));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoomPercent((prev) => Math.max(50, prev - 10));
  };

  // Default signature fallbacks
  const baseSignatures = signatures && signatures.length > 0 ? signatures : [
    { label: 'Prepared By', sub: 'Accountant / Staff' },
    { label: 'Verified By', sub: 'Accounts Department' },
    { label: 'Authorized Signature', sub: `Proprietor / ${legalName}` },
  ];

  const resolvedSignatures = baseSignatures.map(sig => ({
    ...sig,
    sub: sig.sub ? sig.sub.replace('Shahid Yaseen', legalName) : sig.sub,
  }));

  const scaleRatio = zoomPercent / 100;
  const scaledWrapperHeight = docHeight > 0 ? Math.ceil(docHeight * scaleRatio) : undefined;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden font-sans">
      {/* ── Screen-only Action Toolbar ─────────────────────────────── */}
      <div className="pb-2 mb-2 border-b border-[#E0DBD3] no-print flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-start">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Document View
            </span>
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              {actionTitle || `${title} — ${documentNo || 'Preview'}`}
            </h3>
          </div>

          {/* Fit & Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] px-2 py-1 rounded border border-[#D1D5DB] text-xs">
            <button
              type="button"
              onClick={handleFitPage}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                fitMode === 'page'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Scale document height to fit full page without scrolling"
            >
              Fit to Page
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition-colors ${
                fitMode === 'width'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Scale document width to fit container width"
            >
              Fit to Width
            </button>

            <span className="h-4 w-px bg-gray-300 mx-1" />

            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomPercent <= 50}
              className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 disabled:opacity-40 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-gray-800 text-xs w-10 text-center">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomPercent >= 150}
              className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 disabled:opacity-40 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
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

      {/* ── Scrollable Center Stage for Full Document ──────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-auto bg-gray-100/70 p-2 sm:p-4 flex flex-col items-center justify-start print:p-0 print:bg-transparent print:overflow-visible print:block"
      >
        <div
          className="w-full flex justify-center items-start print:block"
          style={{
            height: scaledWrapperHeight ? `${scaledWrapperHeight}px` : 'auto',
            overflow: 'visible',
          }}
        >
          <div
            ref={docRef}
            id={id}
            dir="ltr"
            className={`print-document print-area w-full max-w-[850px] bg-white text-black p-4 sm:p-6 print:p-0 print:m-0 shadow-xl print:shadow-none border border-gray-300 print:border-none transition-transform duration-100 ${className}`}
            style={{
              boxSizing: 'border-box',
              transform: `scale(${scaleRatio})`,
              transformOrigin: 'top center',
            }}
          >


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
        </div>
      </div>
    </div>
  );
}
