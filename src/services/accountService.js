import { db } from '../db/database.js';
import { getAccountUsageCount } from '../utils/masterUsageChecker.js';
import { cashBookService } from './cashBookService.js';

export const accountService = {
  async getAll() {
    return await db.accounts.toArray();
  },

  async getById(id) {
    return await db.accounts.get(id);
  },

  async add(accountData) {
    const id = accountData.id || 'acc_' + Date.now();
    const accounts = await db.accounts.toArray();
    const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));
    const nextCode = accountData.code || String(99101 + bankAccounts.length);
    const openingBalance = Number(accountData.openingBalance || accountData.balance || 0);

    const item = {
      id,
      code: nextCode,
      name: accountData.name,
      type: accountData.type || 'Asset',
      openingBalance,
      balance: openingBalance,
    };
    await db.accounts.add(item);
    return item;
  },

  async update(id, accountData) {
    const existing = await db.accounts.get(id);
    if (!existing) throw new Error('Account not found');

    const openingBalance =
      accountData.openingBalance !== undefined
        ? Number(accountData.openingBalance)
        : existing.openingBalance !== undefined
        ? Number(existing.openingBalance)
        : 0;

    const updated = {
      ...existing,
      name: accountData.name || existing.name,
      code: accountData.code ? String(accountData.code).trim() : existing.code,
      openingBalance,
    };

    await db.accounts.put(updated);

    // If opening balance was updated or name changed, recalculate the balance
    await this.recalculateAccountBalance(id);

    return await db.accounts.get(id);
  },

  async updateBalance(id, newBalance) {
    return await db.accounts.update(id, { balance: Number(newBalance) });
  },

  async delete(id) {
    const existing = await db.accounts.get(id);
    if (!existing) return;

    if (existing.name.toLowerCase() === 'cash') {
      throw new Error('Physical Cash account cannot be deleted');
    }

    const count = await getAccountUsageCount(existing.id, existing.name);
    if (count > 0) {
      throw new Error(`This record is used in ${count} transactions. Delete or edit those first`);
    }

    return await db.accounts.delete(id);
  },

  async recalculateAccountBalance(id) {
    const acc = await db.accounts.get(id);
    if (!acc) return 0;

    if (acc.name.toLowerCase() === 'cash') {
      return await cashBookService.recalculateCashBalance();
    }

    const opening = Number(acc.openingBalance || 0);
    let running = opening;

    const receipts = db.receipts ? await db.receipts.toArray() : [];
    receipts.forEach((r) => {
      if (r.account === acc.name || r.accountId === acc.id) {
        running += Number(r.amount || 0);
      }
    });

    const payments = db.payments ? await db.payments.toArray() : [];
    payments.forEach((p) => {
      if (p.account === acc.name || p.accountId === acc.id) {
        running -= Number(p.amount || 0);
      }
    });

    const expenses = db.expenses ? await db.expenses.toArray() : [];
    expenses.forEach((e) => {
      if (e.account === acc.name || e.accountId === acc.id) {
        running -= Number(e.amount || 0);
      }
    });

    const cashBook = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
    cashBook.forEach((cb) => {
      if (cb.bankAccountId === acc.id || cb.bankAccountName === acc.name) {
        if (cb.type === 'Deposit') running += Number(cb.debit || 0);
        if (cb.type === 'Withdrawal') running -= Number(cb.credit || 0);
      }
    });

    const journals = db.journalEntries ? await db.journalEntries.toArray() : [];
    journals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        if (l.accountId === acc.id || l.accountName === acc.name) {
          running = running + Number(l.debit || 0) - Number(l.credit || 0);
        }
      });
    });

    await db.accounts.update(acc.id, { balance: running });
    return running;
  },
};
