import React from 'react';
import logoImg from '../../assets/logo.png';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * CompanyLogo component displaying the client's official branding
 * (Yaseen mark, text, and green-teal-blue gradient dots)
 */
export default function CompanyLogo({
  variant = 'default', // 'default' | 'onDark' | 'print'
  size = 'md', // 'sm' | 'md' | 'lg'
  showTagline = true,
  className = '',
}) {
  const { profile, defaultLogo } = useCompanyProfile();
  const isDark = variant === 'onDark';

  const logoHeight = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';
  const effectiveLogo = profile?.logoUrl || defaultLogo || logoImg;
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const tagline = profile?.tagline || 'Cotton Waste Merchant';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-xl transition-all ${
          isDark
            ? 'bg-white/95 p-1.5 shadow-md border border-white/20'
            : 'bg-transparent'
        }`}
      >
        <img
          src={effectiveLogo}
          alt={`${legalName} Logo`}
          className={`${logoHeight} object-contain`}
        />
      </div>

      {showTagline && (
        <div className="flex flex-col">
          <span
            className={`font-bold tracking-tight leading-snug truncate max-w-[170px] ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            } ${isDark ? 'text-white' : 'text-[#1E3A5F]'}`}
            title={legalName}
          >
            {legalName}
          </span>
          <span
            className={`text-xs font-medium tracking-wide truncate max-w-[170px] ${
              isDark ? 'text-emerald-300/90' : 'text-gray-500'
            }`}
            title={tagline}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}
