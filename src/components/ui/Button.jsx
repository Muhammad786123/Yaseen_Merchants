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
    'inline-flex items-center justify-center gap-1.5 font-bold rounded-none border border-black transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-none';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  const variantStyles = {
    primary:
      'bg-[#1a6b2e] text-white hover:bg-[#145223] active:bg-[#0f3d1a]',
    secondary:
      'bg-[#EBE9ED] text-black hover:bg-gray-200 active:bg-gray-300',
    success:
      'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900',
    danger:
      'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
    outline:
      'bg-white text-black hover:bg-gray-100 active:bg-gray-200',
    ghost:
      'bg-transparent text-black border-transparent hover:bg-gray-100 active:bg-gray-200',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
}
