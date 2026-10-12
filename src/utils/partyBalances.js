/**
 * partyBalances.js
 *
 * CONVENTION (single source of truth for the whole app):
 *  party.balance > 0  => we owe the party => CREDIT (Jama), shown "Cr", Payable (red)
 *  party.balance < 0  => party owes us    => DEBIT (Benaam), shown "Dr", Receivable (green)
 *  party.balance = 0  => zero balance
 */

/**
 * Single source of truth for party balance classification.
 * Returns side ('Dr' | 'Cr'), positive amount (Math.abs), and Urdu label ('Benaam' | 'Jama').
 * Party type (Customer/Supplier) is NEVER used to decide the side.
 *
 * @param {number|string} balance
 * @returns {{ side: 'Dr' | 'Cr', amount: number, label: 'Benaam' | 'Jama' }}
 */
export function partySide(balance) {
  const num = Number(balance || 0);
  if (num > 0) {
    return { side: 'Cr', amount: num, label: 'Jama' };
  }
  if (num < 0) {
    return { side: 'Dr', amount: Math.abs(num), label: 'Benaam' };
  }
  return { side: 'Cr', amount: 0, label: 'Jama' };
}

/**
 * Split parties into Receivables (Dr / Benaam) and Payables (Cr / Jama) based purely on balance.
 *
 * @param {Array} parties
 * @returns {{ receivableParties: Array, payableParties: Array, totalReceivable: number, totalPayable: number }}
 */
export function splitPartyBalances(parties = []) {
  const safeParties = Array.isArray(parties) ? parties : [];
  const receivableParties = safeParties.filter(
    (p) => partySide(p.balance).side === 'Dr' && Number(p.balance || 0) !== 0
  );
  const payableParties = safeParties.filter(
    (p) => partySide(p.balance).side === 'Cr' && Number(p.balance || 0) !== 0
  );

  return {
    receivableParties,
    payableParties,
    totalReceivable: receivableParties.reduce((s, p) => s + partySide(p.balance).amount, 0),
    totalPayable: payableParties.reduce((s, p) => s + partySide(p.balance).amount, 0),
  };
}
