import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';
import { accountService } from './accountService.js';

export const expenseService = {
  async getAll() {
    return await db.expenses.reverse().toArray();
  },

  async getById(id) {
    return await db.expenses.get(id);
  },

  async add(expenseData) {
    const id = expenseData.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const amount = Number(expenseData.amount || 0);

    let accountObj = null;
    if (expenseData.accountId) {
      accountObj = await db.accounts.get(expenseData.accountId);
    } else if (expenseData.account) {
      accountObj = await db.accounts.where({ name: expenseData.account }).first();
    }

    const newExpense = {
      id,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      description: expenseData.description || '',
      category: expenseData.category || 'Labour',
      amount,
      accountId: accountObj ? accountObj.id : expenseData.accountId || null,
      account: accountObj ? accountObj.name : expenseData.account || 'Cash',
      createdAt: expenseData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.expenses, db.cashBookEntries, db.accounts], async () => {
      await db.expenses.add(newExpense);

      if (newExpense.account === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          date: newExpense.date,
          type: 'Expense',
          debit: amount,
          credit: 0,
          description: `${expenseData.category}: ${expenseData.description || ''}`,
          linkedTransactionId: id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) - amount,
          });
        }
      } else {
        const bankAcc = (newExpense.accountId ? await db.accounts.get(newExpense.accountId) : null) ||
          (await db.accounts.where({ name: newExpense.account }).first());
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) - amount,
          });
        }
      }
    });

    if (newExpense.accountId) {
      await accountService.recalculateAccountBalance(newExpense.accountId);
    }

    await cashBookService.recalculateCashBalance();

    return newExpense;
  },

  /**
   * Atomic Update for Expense:
   * (1) Reverse old expense effect on Cash Book / Cash balance or Bank balance
   * (2) Apply new expense effect on Cash Book / Cash balance or Bank balance
   * (3) Preserve id, createdAt; update updatedAt and editCount
   */
  async update(id, expenseData) {
    const existing = await db.expenses.get(id);
    if (!existing) throw new Error('Expense record not found: ' + id);

    const newAmount = Number(expenseData.amount || 0);
    const newAccount = expenseData.account || existing.account || 'Cash';

    let accountObj = null;
    if (expenseData.accountId) {
      accountObj = await db.accounts.get(expenseData.accountId);
    } else if (newAccount) {
      accountObj = await db.accounts.where({ name: newAccount }).first();
    }

    const updatedExpense = {
      ...existing,
      date: expenseData.date || existing.date,
      description: expenseData.description !== undefined ? expenseData.description : existing.description,
      category: expenseData.category || existing.category,
      amount: newAmount,
      accountId: accountObj ? accountObj.id : expenseData.accountId || existing.accountId || null,
      account: accountObj ? accountObj.name : newAccount,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.expenses, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse old expense effect
      if (existing.account === 'Cash') {
        let cbEntries = await db.cashBookEntries
          .where({ linkedTransactionId: existing.id })
          .toArray();

        if (cbEntries.length === 0) {
          const allCb = await db.cashBookEntries.toArray();
          cbEntries = allCb.filter(
            (cb) => cb.type === 'Expense' && cb.description && cb.description.includes(existing.description)
          );
        }

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          let netAdj = 0;
          for (const cb of cbEntries) {
            netAdj += Number(cb.debit || 0) - Number(cb.credit || 0);
          }
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + netAdj,
          });
        }
        for (const cb of cbEntries) {
          await db.cashBookEntries.delete(cb.id);
        }
      } else {
        const bankAcc = (existing.accountId ? await db.accounts.get(existing.accountId) : null) ||
          (await db.accounts.where({ name: existing.account }).first());
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) + Number(existing.amount || 0),
          });
        }
      }

      // 2. Apply new expense effect
      if (newAccount === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          date: updatedExpense.date,
          type: 'Expense',
          debit: newAmount,
          credit: 0,
          description: `${updatedExpense.category}: ${updatedExpense.description || ''}`,
          linkedTransactionId: existing.id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) - newAmount,
          });
        }
      } else {
        const bankAcc = (updatedExpense.accountId ? await db.accounts.get(updatedExpense.accountId) : null) ||
          (await db.accounts.where({ name: newAccount }).first());
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) - newAmount,
          });
        }
      }

      // 3. Save updated expense
      await db.expenses.put(updatedExpense);
    });

    if (existing.accountId) {
      await accountService.recalculateAccountBalance(existing.accountId);
    }
    if (updatedExpense.accountId && updatedExpense.accountId !== existing.accountId) {
      await accountService.recalculateAccountBalance(updatedExpense.accountId);
    }

    await cashBookService.recalculateCashBalance();

    return updatedExpense;
  },

  /**
   * Atomic Delete for Expense:
   * (1) Reverse effect on Cash Book & Cash account balance or Bank account balance
   * (2) Remove record from db.expenses
   */
  async delete(id) {
    const existing = await db.expenses.get(id);
    if (!existing) return;

    await db.transaction('rw', [db.expenses, db.cashBookEntries, db.accounts], async () => {
      if (existing.account === 'Cash') {
        let cbEntries = await db.cashBookEntries
          .where({ linkedTransactionId: existing.id })
          .toArray();

        if (cbEntries.length === 0) {
          const allCb = await db.cashBookEntries.toArray();
          cbEntries = allCb.filter(
            (cb) => cb.type === 'Expense' && cb.description && cb.description.includes(existing.description)
          );
        }

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          let netAdj = 0;
          for (const cb of cbEntries) {
            netAdj += Number(cb.debit || 0) - Number(cb.credit || 0);
          }
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + netAdj,
          });
        }
        for (const cb of cbEntries) {
          await db.cashBookEntries.delete(cb.id);
        }
      } else {
        const bankAcc = (existing.accountId ? await db.accounts.get(existing.accountId) : null) ||
          (await db.accounts.where({ name: existing.account }).first());
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) + Number(existing.amount || 0),
          });
        }
      }

      await db.expenses.delete(id);
    });

    if (existing.accountId) {
      await accountService.recalculateAccountBalance(existing.accountId);
    }

    await cashBookService.recalculateCashBalance();
  },
};
