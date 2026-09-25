// Currency, number, and date formatters

/**
 * Format a number as Pakistani Rupee (PKR)
 * @param {number} n
 * @returns {string}
 */
export function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rs.0';
  return 'Rs.' + Number(n).toLocaleString('en-PK');
}

/**
 * Format a number with commas
 * @param {number} n
 * @returns {string}
 */
export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-PK');
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
