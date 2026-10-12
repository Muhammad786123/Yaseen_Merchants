import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { useParties } from './useParties.js';
import { usePurchases } from './usePurchases.js';
import { useSales } from './useSales.js';
import { useFinances } from './useFinances.js';
import { useCashBook } from './useCashBook.js';
import { useIssues } from './useIssues.js';
import { buildPartyTransactions } from '../services/partyService.js';

/**
 * Custom hook to compile and calculate 9-column Party Account Ledger transactions
 * matching legacy PERBALACC statement layout.
 *
 * Uses shared buildPartyTransactions from partyService.
 * Columns: Date, Detail, Bill No., Quantity, Weight, Rate, Debit (Dr), Credit (Cr), Balance
 */
export function usePartyLedger(selectedPartyId) {
  const { parties } = useParties();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { receipts, payments } = useFinances();
  const { cashBookEntries } = useCashBook();
  const { issues } = useIssues();
  const journalEntries =
    useLiveQuery(() => (db.journalEntries ? db.journalEntries.toArray() : []), []) || [];

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // Compile all transactions using the shared buildPartyTransactions logic
  const transactions = buildPartyTransactions(selectedPartyId, {
    purchases,
    sales,
    receipts,
    payments,
    cashBookEntries,
    issues,
    journalEntries,
  });

  // Compute running balance: positive = Cr (we owe the party), negative = Dr (party owes us)
  let runningBalance = Number(selectedParty?.openingBalance || 0);
  const ledgerRows = transactions.map((t) => {
    runningBalance += Number(t.credit || 0) - Number(t.debit || 0);
    return { ...t, balance: runningBalance };
  });

  return {
    selectedParty,
    transactions,
    ledgerRows,
    openingBalance: Number(selectedParty?.openingBalance || 0),
    currentBalance: selectedParty?.balance !== undefined ? selectedParty.balance : runningBalance,
  };
}
