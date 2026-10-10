import { db } from '../db/database.js';

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
    const account = expenseData.account || 'Cash';

    const newExpense = {
      id,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      description: expenseData.description || '',
      category: expenseData.category || 'Labour',
      amount,
      account,
      createdAt: expenseData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.expenses, db.cashBookEntries, db.accounts], async () => {
      await db.expenses.add(newExpense);

      if (account === 'Cash') {
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
        const bankAcc = await db.accounts.where({ name: account }).first();
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) - amount,
          });
        }
      }
    });

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
    const newAccount = expenseData.account || 'Cash';

    const updatedExpense = {
      ...existing,
      date: expenseData.date || existing.date,
      description: expenseData.description !== undefined ? expenseData.description : existing.description,
      category: expenseData.category || existing.category,
      amount: newAmount,
      account: newAccount,
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
        const bankAcc = await db.accounts.where({ name: existing.account }).first();
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
        const bankAcc = await db.accounts.where({ name: newAccount }).first();
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) - newAmount,
          });
        }
      }

      // 3. Save updated expense
      await db.expenses.put(updatedExpense);
    });

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
        const bankAcc = await db.accounts.where({ name: existing.account }).first();
        if (bankAcc) {
          await db.accounts.update(bankAcc.id, {
            balance: Number(bankAcc.balance || 0) + Number(existing.amount || 0),
          });
        }
      }

      await db.expenses.delete(id);
    });
  },
};
