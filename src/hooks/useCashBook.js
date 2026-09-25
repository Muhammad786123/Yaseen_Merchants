import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { cashBookService } from '../services/cashBookService.js';

export function useCashBook() {
  const rawEntries = useLiveQuery(() => db.cashBookEntries.toArray(), []) || [];
  const bankTransfers = useLiveQuery(() => db.bankTransfers.toArray(), []) || [];

  // Sort entries ascending by date to compute accurate running physical cash balance
  const sorted = [...rawEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 250000;

  const entriesWithBalance = sorted.map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    running = running - debit + credit;
    return {
      ...entry,
      balance: running,
    };
  });

  // Display newest first
  const cashBookEntries = [...entriesWithBalance].reverse();

  return {
    cashBookEntries,
    bankTransfers,
    currentCashBalance: running,
    addCashEntry: cashBookService.addEntry.bind(cashBookService),
    depositToBank: cashBookService.depositToBank.bind(cashBookService),
    withdrawFromBank: cashBookService.withdrawFromBank.bind(cashBookService),
    giveCashToParty: cashBookService.giveCashToParty.bind(cashBookService),
    receiveCashFromParty: cashBookService.receiveCashFromParty.bind(cashBookService),
  };
}
