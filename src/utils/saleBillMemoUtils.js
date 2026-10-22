/**
 * saleBillMemoUtils.js
 *
 * Calculations and formatting utilities for Sale Bill / Memo.
 */

/**
 * Format date as DD-MM-YYYY (e.g. 08-10-2026)
 */
export function formatBillDate(d) {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(d)) return d;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format weight with 3 decimals: e.g. 399.500
 */
export function formatWeight(w) {
  if (w === '' || w === null || w === undefined) return '';
  const num = Number(w);
  if (isNaN(num)) return String(w);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/**
 * Format rate with 2 decimals: e.g. 212.00
 */
export function formatRate(r) {
  if (r === '' || r === null || r === undefined) return '';
  const num = Number(r);
  if (isNaN(num)) return String(r);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format amount with thousands separators: e.g. 84,694
 */
export function formatAmount(a) {
  if (a === '' || a === null || a === undefined) return '0';
  const num = Number(a);
  if (isNaN(num)) return String(a);
  return num.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

/**
 * Format integer count / nugs: e.g. 5
 */
export function formatCount(c) {
  if (c === '' || c === null || c === undefined) return '';
  const num = Number(c);
  if (isNaN(num)) return String(c);
  return num.toLocaleString('en-US');
}

/**
 * Single source of truth for Sale Bill side calculation:
 * - Previous = getPartyBalanceBeforeInvoice(party, bill)
 * - Final = previous - bill total + received
 * - balance > 0 = جمع, < 0 = نام (never a minus sign)
 *
 * @param {Object} params
 * @param {number} [params.previousBalance=0]
 * @param {number} [params.total=0]
 * @param {number} [params.received=0]
 * @returns {Object}
 */
export function computeSaleBillBalances({ previousBalance = 0, total = 0, received = 0 }) {
  const prev = Number(previousBalance || 0);
  const tot = Number(total || 0);
  const rec = Number(received || 0);

  // Final = previous - bill total + received (matches customer debit in ledger)
  const final = prev - tot + rec;

  const previousSide = prev < -0.0001 ? 'نام' : prev > 0.0001 ? 'جمع' : '';
  const finalSide = final < -0.0001 ? 'نام' : final > 0.0001 ? 'جمع' : '';
  const billSide = 'نام'; // Sale bill side word is always نام

  return {
    previous: prev,
    previousAbs: Math.abs(prev),
    previousSide,
    total: tot,
    billSide,
    received: rec,
    final,
    finalAbs: Math.abs(final),
    finalSide,
  };
}

export { getLineLabel } from './formatters.js';
