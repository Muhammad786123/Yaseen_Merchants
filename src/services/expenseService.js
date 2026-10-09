import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';

export const expenseService = {
  async getAll() {
    return await db.expenses.reverse().toArray();
  },

  async add(expenseData) {
    const id = expenseData.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const amount = Number(expenseData.amount || 0);

    const newExpense = {
      id,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      description: expenseData.description || '',
      category: expenseData.category || 'Labour',
      amount,
      account: expenseData.account || 'Cash',
    };

    await db.expenses.add(newExpense);

    if (expenseData.account === 'Cash') {
      await cashBookService.addEntry({
        date: newExpense.date,
        type: 'Expense',
        debit: amount,
        credit: 0,
        description: `${expenseData.category}: ${expenseData.description}`,
        linkedTransactionId: id,
      });
    } else {
      // Reduce bank account balance
      const accountObj = await db.accounts.where({ name: expenseData.account }).first();
      if (accountObj) {
        await db.accounts.update(accountObj.id, {
          balance: Math.max(0, Number(accountObj.balance || 0) - amount),
        });
      }
    }

    return newExpense;
  },

  async delete(id) {
    return await db.expenses.delete(id);
  },
};
