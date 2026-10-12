import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { cashBookService } from '../services/cashBookService.js';
import { compareCashEntries } from '../services/cashService.js';

export function useCashBook() {
  const rawEntries = useLiveQuery(() => db.cashBookEntries.toArray(), []) || [];
  const bankTransfers = useLiveQuery(() => db.bankTransfers.toArray(), []) || [];

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const cashAcc = accounts.find((a) => a.name.toLowerCase() === 'cash');
  const initialCash = Number(cashAcc?.openingBalance || 0);

  // Sort entries ascending chronologically
  const sorted = [...rawEntries].sort(compareCashEntries);
  let running = initialCash;

  const entriesWithBalance = sorted.map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    running = running + credit - debit;
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
    updateEntry: cashBookService.update.bind(cashBookService),
    deleteEntry: cashBookService.delete.bind(cashBookService),
    saveBook: cashBookService.saveBook.bind(cashBookService),
    updateBook: cashBookService.updateBook.bind(cashBookService),
    deleteBook: cashBookService.deleteBook.bind(cashBookService),
    getBook: cashBookService.getBook.bind(cashBookService),
    getNextBookNo: cashBookService.getNextBookNo.bind(cashBookService),
    getAllBookNumbers: cashBookService.getAllBookNumbers.bind(cashBookService),
    recalculateCashBalance: cashBookService.recalculateCashBalance.bind(cashBookService),
  };
}
