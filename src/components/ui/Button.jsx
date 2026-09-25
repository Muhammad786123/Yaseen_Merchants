import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  icon: Icon = null,
}) {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-[#1E3A5F] text-white border border-[#1E3A5F] hover:bg-[#162d4a] focus:ring-[#1E3A5F]',
    secondary:
      'bg-white text-[#1E3A5F] border border-[#E0DBD3] hover:bg-[#F5F4F0] focus:ring-[#E0DBD3]',
    success:
      'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    danger:
      'bg-red-600 text-white border border-red-600 hover:bg-red-700 focus:ring-red-500',
    outline:
      'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
    ghost:
      'bg-transparent text-gray-600 border border-transparent hover:bg-gray-100 focus:ring-gray-200',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}
