import React from 'react';
import logoImg from '../../assets/logo.png';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * Reusable Printable Header Component for Invoices, Vouchers, Party Statements, and Financial Reports
 * Displays client's official logo, full legal business name, contact info, and document title.
 */
export default function PrintHeader({
  documentTitle = 'STATEMENT OF ACCOUNT',
  subtitle = '',
  documentNo = '',
  dateStr = '',
  partyName = '',
  className = '',
}) {
  const { profile, defaultLogo } = useCompanyProfile();

  const effectiveLogo = profile?.logoUrl || defaultLogo || logoImg;
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const tagline = profile?.tagline || 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant';
  const address = profile?.address || 'Faisalabad, Pakistan';
  const phone = profile?.phone || '+92 300 1234567';

  return (
    <div
      className={`hidden print:block border-b-2 border-[#1E3A5F] pb-4 mb-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={effectiveLogo} alt={`${legalName} Logo`} className="h-16 object-contain" />
          <div>
            <h1 className="text-2xl font-black text-[#1E3A5F] uppercase tracking-wide print-company-name">
              {legalName}
            </h1>
            <p className="text-sm text-gray-700 font-medium print-note-text">
              {tagline}
            </p>
            <p className="text-sm text-gray-600 print-note-text">
              {address}{phone ? ` • Tel: ${phone}` : ''}
            </p>
          </div>
        </div>

        <div className="text-end">
          <div className="text-base font-extrabold text-[#1E3A5F] uppercase tracking-wider bg-[#FAF9F7] px-3.5 py-1.5 rounded border border-[#E0DBD3] inline-block print-statement-title">
            {documentTitle}
          </div>
          {documentNo && (
            <div className="text-sm font-mono font-bold text-[#1E3A5F] mt-1 print-note-text">
              Doc #: {documentNo}
            </div>
          )}
          {dateStr && (
            <div className="text-sm text-gray-700 mt-0.5 print-note-text">
              Date: {dateStr}
            </div>
          )}
          {partyName && (
            <div className="text-lg font-bold text-gray-900 mt-1 print-account-name">
              Party: {partyName}
            </div>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 text-sm text-gray-700 italic print-note-text">
          {subtitle}
        </div>
      )}
    </div>
  );
}
