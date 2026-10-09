/**
 * partyBalances.js
 *
 * Single source of truth for splitting parties into Receivables and Payables.
 * Based purely on balance sign (party type Customer/Supplier/Both is ignored, matching traditional double-entry/Trial Balance rules):
 *   - party.balance < 0 -> Receivable (Naam / Debit, party owes us money). Amount = Math.abs(balance)
 *   - party.balance > 0 -> Payable (Jama / Credit, we owe the party money). Amount = balance
 *   - party.balance = 0 -> neither
 */

export function splitPartyBalances(parties = []) {
  const safeParties = Array.isArray(parties) ? parties : [];
  const receivableParties = safeParties.filter((p) => Number(p.balance || 0) < 0);
  const payableParties = safeParties.filter((p) => Number(p.balance || 0) > 0);

  return {
    receivableParties,
    payableParties,
    totalReceivable: receivableParties.reduce((s, p) => s + Math.abs(Number(p.balance || 0)), 0),
    totalPayable: payableParties.reduce((s, p) => s + Number(p.balance || 0), 0),
  };
}
