/**
 * partySide.js
 *
 * Single source of truth for party ledger / account balance side,
 * English (Dr/Cr) label, Urdu (بنام/جمع) label, and status color across the entire application.
 *
 * Party ledger running balance definition:
 *   runningBalance = openingBalance + credit - debit
 *
 * Rules:
 *   runningBalance > 0 => Cr / جمع (we owe the party, Jama) -> Green
 *   runningBalance < 0 => Dr / بنام (party owes us, Benaam)  -> Red
 *   runningBalance = 0 => no label (0 balance)
 *
 * Debit spelling rule:
 *   Always use 'بنام' (never 'نام').
 */

export const BALANCE_COLORS = {
  CREDIT: '#16a34a', // جمع / Cr (Green)
  DEBIT: '#dc2626',  // بنام / Dr (Red)
  ZERO: undefined,
};

export const BALANCE_CLASSES = {
  CREDIT: 'text-[#1a6b2e]',
  DEBIT: 'text-red-600',
  ZERO: 'text-gray-800',
};

/**
 * Returns balance side details: English label, Urdu label, absolute amount, and color.
 *
 * @param {number|string} runningBalance
 * @returns {{
 *   en: 'Cr' | 'Dr' | '',
 *   ur: 'جمع' | 'بنام' | '',
 *   amount: number,
 *   color: string | undefined,
 *   textClass: string,
 *   label: string
 * }}
 */
export function balanceSide(runningBalance) {
  const num = Number(runningBalance || 0);

  // Treat negligible floating point noise as 0
  if (Math.abs(num) < 0.00001) {
    return {
      en: '',
      ur: '',
      amount: 0,
      color: BALANCE_COLORS.ZERO,
      textClass: BALANCE_CLASSES.ZERO,
      label: '',
    };
  }

  if (num > 0) {
    return {
      en: 'Cr',
      ur: 'جمع',
      amount: Math.abs(num),
      color: BALANCE_COLORS.CREDIT,
      textClass: BALANCE_CLASSES.CREDIT,
      label: 'جمع (Cr)',
    };
  }

  return {
    en: 'Dr',
    ur: 'بنام',
    amount: Math.abs(num),
    color: BALANCE_COLORS.DEBIT,
    textClass: BALANCE_CLASSES.DEBIT,
    label: 'بنام (Dr)',
  };
}

/**
 * Formats a running balance with localized number, Urdu label, and English Dr/Cr label.
 * E.g. "52,000 جمع (Cr)", "60,000 بنام (Dr)", or "0".
 *
 * @param {number|string} runningBalance
 * @param {Object} [options]
 * @param {boolean} [options.withCurrency=false] - Prepend "Rs. "
 * @param {number} [options.decimals=0] - Decimal places
 * @returns {string}
 */
export function formatBalanceWithSide(runningBalance, options = {}) {
  const side = balanceSide(runningBalance);
  if (side.amount === 0) {
    return options.withCurrency ? 'Rs. 0' : '0';
  }

  const decimals = options.decimals !== undefined ? options.decimals : 0;
  const numStr = side.amount.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const prefix = options.withCurrency ? 'Rs. ' : '';
  return `${prefix}${numStr} ${side.ur} (${side.en})`;
}
