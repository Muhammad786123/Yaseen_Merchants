// Currency, number, and date formatters

/**
 * Format a number with thousands separators, never showing decimals unless the amount has them
 * @param {number|string} n
 * @returns {string}
 */
export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return '0';
  const num = Number(n);
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number as Pakistani Rupee (PKR) with thousands separators and no decimals unless present
 * @param {number|string} n
 * @returns {string}
 */
export function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return 'Rs. 0';
  return 'Rs. ' + fmtNum(n);
}

/**
 * Format date string (YYYY-MM-DD) to friendly format
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string}
 */
export function getTodayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
