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
          <img src={effectiveLogo} alt={`${legalName} Logo`} className="h-14 object-contain" />
          <div>
            <h1 className="text-xl font-black text-[#1E3A5F] uppercase tracking-wide">
              {legalName}
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              {tagline}
            </p>
            <p className="text-[11px] text-gray-500">
              {address}{phone ? ` • Tel: ${phone}` : ''}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider bg-[#FAF9F7] px-3 py-1 rounded border border-[#E0DBD3] inline-block">
            {documentTitle}
          </div>
          {documentNo && (
            <div className="text-xs font-mono font-bold text-[#1E3A5F] mt-1">
              Doc #: {documentNo}
            </div>
          )}
          {dateStr && (
            <div className="text-xs text-gray-600 mt-0.5">
              Date: {dateStr}
            </div>
          )}
          {partyName && (
            <div className="text-xs font-semibold text-gray-800 mt-0.5">
              Party: {partyName}
            </div>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 text-xs text-gray-600 italic">
          {subtitle}
        </div>
      )}
    </div>
  );
}
