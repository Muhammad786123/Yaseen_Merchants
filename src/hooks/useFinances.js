import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { receiptService } from '../services/receiptService.js';
import { paymentService } from '../services/paymentService.js';
import { expenseService } from '../services/expenseService.js';
import { accountService } from '../services/accountService.js';

export function useFinances() {
  const receipts = useLiveQuery(() => db.receipts.reverse().toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.reverse().toArray(), []) || [];
  const expenses = useLiveQuery(() => db.expenses.reverse().toArray(), []) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];

  return {
    receipts,
    payments,
    expenses,
    accounts,
    addReceipt: receiptService.add,
    deleteReceipt: receiptService.delete,
    addPayment: paymentService.add,
    deletePayment: paymentService.delete,
    addExpense: expenseService.add,
    updateExpense: expenseService.update,
    deleteExpense: expenseService.delete,
    addAccount: accountService.add,
  };
}
